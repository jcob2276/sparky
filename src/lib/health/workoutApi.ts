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
