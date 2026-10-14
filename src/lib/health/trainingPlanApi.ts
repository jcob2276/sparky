import { supabase, invokeEdge } from '../supabase';
import { getTodayWarsaw, shiftDateStr, warsawDayBoundsISO, formatWarsawDate } from '../date';
import { newExercise, newSet } from './workout';
import type { WorkoutLoggerInitial } from './workoutDraft';
import type { TrainingSession, TrainingPlanDraft } from '@vanguard/domain';
import type { Tables } from '../database.types';

export type PlanVersion = Tables<'training_plan_versions'>;
export type PlannedWorkout = Tables<'training_plan_workouts'>;
export type CoachJobRow = Tables<'health_coach_jobs'>;
export type RunningActivity = Pick<Tables<'strava_activities_clean'>, 'strava_id' | 'name' | 'start_date' | 'distance' | 'sport_type' | 'source'>;

/** The server owns snapshots. Guard the shape for legacy/corrupt rows before rendering it. */
export function readPlanSnapshot(raw: unknown): TrainingPlanDraft | null {
  if (!raw || typeof raw !== 'object' || !('sessions' in raw) || !Array.isArray(raw.sessions)
    || !('title' in raw) || typeof raw.title !== 'string' || !('startDate' in raw) || typeof raw.startDate !== 'string') return null;
  if (!raw.sessions.every(session => session && typeof session === 'object' && typeof session.date === 'string'
    && typeof session.name === 'string' && Array.isArray(session.exercises))) return null;
  return raw as TrainingPlanDraft;
}

export async function fetchTrainingPlan(userId: string) {
  const [versions, sessions, jobs, runs] = await Promise.all([
    supabase.from('training_plan_versions').select('*').eq('user_id', userId).order('revision', { ascending: false }).limit(12),
    supabase.from('training_plan_workouts').select('*').eq('user_id', userId).gte('planned_date', getTodayWarsaw()).order('planned_date').limit(120),
    supabase.from('health_coach_jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('strava_activities_clean').select('strava_id,name,start_date,distance,sport_type,source').eq('user_id', userId).eq('is_oura', false)
      .ilike('sport_type', '%run%').gte('start_date', warsawDayBoundsISO(shiftDateStr(getTodayWarsaw(), -7)).fromISO)
      .lte('start_date', new Date().toISOString()).order('start_date', { ascending: false }).limit(30),
  ]);
  for (const result of [versions, sessions, jobs, runs]) if (result.error) throw result.error;
  return { versions: versions.data ?? [], sessions: sessions.data ?? [], jobs: jobs.data ?? [], runs: runs.data ?? [] };
}

export function matchingRuns(workout: Pick<PlannedWorkout, 'planned_date'>, runs: RunningActivity[]): RunningActivity[] {
  if (!workout.planned_date) return [];
  const from = shiftDateStr(workout.planned_date, -1), until = shiftDateStr(workout.planned_date, 1);
  return runs.filter(run => run.start_date && run.strava_id != null && (run.distance ?? 0) > 0 && /run/i.test(run.sport_type ?? '')
    && formatWarsawDate(run.start_date) >= from && formatWarsawDate(run.start_date) <= until);
}
export async function linkPlannedRunningActivity(workout: PlannedWorkout, activityId: number): Promise<void> {
  const { error } = await supabase.rpc('link_planned_running_activity', { p_plan_workout_id: workout.id, p_strava_id: activityId });
  if (error) throw error;
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
