import { supabase } from '../supabase';
import { getTodayWarsaw } from '../date';
import type { TablesInsert } from '../database.types';

export async function logWeightMetric(userId: string, weightKg: number, date?: string): Promise<void> {
  const targetDate = date || getTodayWarsaw();
  const { error } = await supabase
    .from('body_metrics')
    .upsert(
      {
        user_id: userId,
        date: targetDate,
        weight: weightKg,
      } as TablesInsert<'body_metrics'>,
      { onConflict: 'user_id,date' }
    );
  if (error) throw error;
}