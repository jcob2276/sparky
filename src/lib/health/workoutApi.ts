import { supabase } from '../supabase';
import type { ExerciseHistoryRow } from './workout';
import { historyNamesFor } from './exerciseHistoryAliases';

export async function fetchExerciseHistory(name: string, userId: string): Promise<ExerciseHistoryRow[]> {
  const names = historyNamesFor(name.trim());
  if (!names.length) return [];

  const { data, error } = await supabase
    .from('exercise_logs')
    .select('weight, reps, rir, set_number, session_id, muscle_tags, exercise_name, workout_sessions!inner(date)')
    .eq('user_id', userId)
    .in('exercise_name', names)
    .limit(500);

  if (error) throw new Error(error.message);
  return (data || []) as ExerciseHistoryRow[];
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function updateWorkoutSession(
  id: string,
  updates: { date: string; workout_day?: string }
): Promise<void> {
  const { error } = await supabase.from('workout_sessions').update(updates).eq('id', id);
  if (error) throw error;
}

export async function updateExerciseLog(
  id: string,
  updates: { weight?: number | null; reps?: number }
): Promise<void> {
  const { error } = await supabase.from('exercise_logs').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteExerciseLog(id: string): Promise<void> {
  const { error } = await supabase.from('exercise_logs').delete().eq('id', id);
  if (error) throw error;
}

export interface WorkoutTemplateSummary {
  sessionId: string;
  workoutDay: string;
  date: string;
  exerciseCount: number;
  exercises: string[];
  totalTonnageKg: number;
  sessionRpe: number | null;
}

export async function fetchRecentWorkoutTemplates(userId: string): Promise<WorkoutTemplateSummary[]> {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_day, date, session_rpe, exercise_logs(exercise_name, weight, reps, muscle_tags)')
    .eq('user_id', userId)
    .not('workout_day', 'ilike', '%sauna%')
    .order('date', { ascending: false })
    .limit(20);

  if (error || !sessions) return [];

  const seenDays = new Set<string>();
  const templates: WorkoutTemplateSummary[] = [];

  for (const s of sessions) {
    const day = (s.workout_day || 'Trening').trim();
    if (seenDays.has(day.toLowerCase())) continue;
    seenDays.add(day.toLowerCase());

    const logs = (s.exercise_logs as Array<{ exercise_name: string; weight: number | null; reps: number | null; muscle_tags: string[] | null }>) || [];
    const uniqueExNames = [...new Set(logs.map((l) => l.exercise_name).filter(Boolean))];
    const totalTonnageKg = logs.reduce((acc, l) => {
      const w = Number(l.weight) || 0;
      const r = Number(l.reps) || 0;
      return acc + (w > 0 && r > 0 ? w * r : 0);
    }, 0);

    templates.push({
      sessionId: s.id,
      workoutDay: day,
      date: s.date ?? '',
      exerciseCount: uniqueExNames.length,
      exercises: uniqueExNames.slice(0, 4),
      totalTonnageKg,
      sessionRpe: s.session_rpe,
    });

    if (templates.length >= 4) break;
  }

  return templates;
}

export interface TodayWorkoutDetails {
  id: string;
  workoutDay: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  sessionRpe: number | null;
  exercises: Array<{
    name: string;
    setsCount: number;
    bestKg: number;
    tonnage: number;
  }>;
  totalTonnageKg: number;
  totalSets: number;
}

export async function fetchTodayWorkoutDetails(userId: string, date: string): Promise<TodayWorkoutDetails | null> {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_day, date, start_time, end_time, session_notes, session_rpe, exercise_logs(exercise_name, weight, reps, rir, set_number)')
    .eq('user_id', userId)
    .eq('date', date)
    .not('workout_day', 'ilike', '%sauna%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !sessions?.length) return null;

  const s = sessions[0];
  const logs = (s.exercise_logs as Array<{ exercise_name: string; weight: number | null; reps: number | null; rir: number | null; set_number: number | null }>) || [];

  const exMap = new Map<string, { setsCount: number; bestKg: number; tonnage: number }>();
  let totalTonnage = 0;

  for (const l of logs) {
    const name = l.exercise_name || 'Inne';
    const cur = exMap.get(name) || { setsCount: 0, bestKg: 0, tonnage: 0 };
    const w = Number(l.weight) || 0;
    const r = Number(l.reps) || 0;
    cur.setsCount += 1;
    if (w > cur.bestKg) cur.bestKg = w;
    const setTonnage = w > 0 && r > 0 ? w * r : 0;
    cur.tonnage += setTonnage;
    totalTonnage += setTonnage;
    exMap.set(name, cur);
  }

  return {
    id: s.id,
    workoutDay: s.workout_day || 'Trening',
    date: s.date ?? date,
    startTime: s.start_time,
    endTime: s.end_time,
    notes: s.session_notes,
    sessionRpe: s.session_rpe,
    exercises: [...exMap.entries()].map(([name, data]) => ({
      name,
      ...data,
    })),
    totalTonnageKg: totalTonnage,
    totalSets: logs.length,
  };
}

