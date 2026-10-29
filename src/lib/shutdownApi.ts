import { supabase } from './supabase';
import { fetchDailyWinTasksForDay, type DailyWinWithTasks } from './dailyWinTasksApi';

export async function fetchDailyWin(userId: string, date: string): Promise<DailyWinWithTasks | null> {
  const { data, error } = await fetchDailyWinTasksForDay(userId, date);
  if (error) throw error;
  return data;
}

export async function fetchDailyReconciliationScore(userId: string, date: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('daily_reconciliations')
    .select('day_score')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data?.day_score ?? null;
}

export async function upsertDailyReconciliationScore(userId: string, date: string, score: number): Promise<void> {
  const { data: recon, error: fetchError } = await supabase
    .from('daily_reconciliations')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (recon) {
    const { error } = await supabase
      .from('daily_reconciliations')
      .update({ day_score: score })
      .eq('id', recon.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('daily_reconciliations')
      .insert({ user_id: userId, date, day_score: score });
    if (error) throw error;
  }
}

export { insertSparkyStream } from './streamApi';
