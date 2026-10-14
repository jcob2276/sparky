import { supabase, invokeEdge } from '../supabase';
import { getTodayWarsaw } from '../date';
import { newExercise, newSet } from './workout';
import type { WorkoutLoggerInitial } from './workoutDraft';
import type { TrainingSession, TrainingPlanDraft } from '@vanguard/domain';
import type { Tables } from '../database.types';

export type PlanVersion = Tables<'training_plan_versions'>;
export type PlannedWorkout = Tables<'training_plan_workouts'>;
export type CoachJobRow = Tables<'health_coach_jobs'>;

/** The server owns snapshots. Guard the shape for legacy/corrupt rows before rendering it. */
export function readPlanSnapshot(raw: unknown): TrainingPlanDraft | null {
  if (!raw || typeof raw !== 'object' || !('sessions' in raw) || !Array.isArray(raw.sessions)
    || !('title' in raw) || typeof raw.title !== 'string' || !('startDate' in raw) || typeof raw.startDate !== 'string') return null;
  if (!raw.sessions.every(session => session && typeof session === 'object' && typeof session.date === 'string'
    && typeof session.name === 'string' && Array.isArray(session.exercises))) return null;
  return raw as TrainingPlanDraft;
}

export async function fetchTrainingPlan(userId: string) {
  const [versions, sessions, jobs] = await Promise.all([
    supabase.from('training_plan_versions').select('*').eq('user_id', userId).order('revision', { ascending: false }).limit(12),
    supabase.from('training_plan_workouts').select('*').eq('user_id', userId).gte('planned_date', getTodayWarsaw()).order('planned_date').limit(120),
    supabase.from('health_coach_jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
  ]);
  for (const result of [versions, sessions, jobs]) if (result.error) throw result.error;
  return { versions: versions.data ?? [], sessions: sessions.data ?? [], jobs: jobs.data ?? [] };
}

export async function requestTrainingPlan(requestKey: string, weeks = 4, instructions = ''): Promise<string> {
  const result = await invokeEdge('analyze-training-load', { body: { action: 'generate_plan', requestKey, weeks, instructions } });
  if (!result.jobId) throw new Error('Brak potwierdzenia zadania generowania planu.');
  return result.jobId;
}
export async function approveTrainingPlan(version: PlanVersion): Promise<void> {
  await invokeEdge('analyze-training-load', { body: { action: 'approve_plan', versionId: version.id,
    baseRevision: version.base_revision, requestKey: `approve:${version.id}` } });
}
export async function revertTrainingPlan(version: PlanVersion): Promise<void> {
  await invokeEdge('analyze-training-load', { body: { action: 'revert_plan', baseRevision: version.revision,
    requestKey: `revert:${version.id}` } });
}

export function plannedWorkoutInitial(planWorkoutId: string, session: TrainingSession): WorkoutLoggerInitial {
  return { workoutName: session.name, planWorkoutId, sessionRpe: null,
    activities: session.type === 'run' || session.type === 'mobility' ? [{ id: Date.now(), name: session.name, min: '', note: session.notes }] : [],
    notes: [session.goal, session.notes, `Plan: ${session.durationMinutes} min, rozgrzewka ${session.warmupMinutes} min, wyciszenie ${session.cooldownMinutes} min.`].join('\n'),
    exercises: session.exercises.map(exercise => ({ ...newExercise(), name: exercise.name, tags: [],
      sets: Array.from({ length: exercise.sets }, () => ({ ...newSet(),
        prescription: { reps: exercise.reps, weightKg: exercise.weightKg, rir: exercise.rir, restSeconds: exercise.restSeconds } })) })),
  };
}

export async function startPlannedWorkout(workout: PlannedWorkout): Promise<WorkoutLoggerInitial> {
  const snapshot = readPlanSnapshot({ title: '', startDate: workout.planned_date, sessions: [workout.prescription] });
  if (!snapshot) throw new Error('Sesja nie ma recepty do wczytania.');
  const { error } = await supabase.rpc('start_planned_workout', { p_plan_workout_id: workout.id });
  if (error) throw error;
  return plannedWorkoutInitial(workout.id, snapshot.sessions[0]);
}
