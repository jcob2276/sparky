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
