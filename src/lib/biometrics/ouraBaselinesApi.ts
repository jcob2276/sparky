import { shiftDateStr } from '../date';
import { supabase } from '../supabase';
import type { BaselineNight } from './ouraBaselines';

const HISTORY_DAYS = 90;

/** Up to 90 days of nightly summaries ending on `asOf` (read-only), newest last. */
export async function fetchOuraBaselineHistory(userId: string, asOf: string): Promise<BaselineNight[]> {
  const { data, error } = await supabase
    .from('oura_daily_summary')
    .select('date,hrv_avg,rhr_avg,sleep_efficiency,latency_minutes,total_sleep_hours,deep_sleep_hours,rem_sleep_hours,bedtime_timestamp')
    .eq('user_id', userId)
    .gte('date', shiftDateStr(asOf, -HISTORY_DAYS))
    .lte('date', asOf)
    .order('date', { ascending: true });
  if (error) throw new Error(`Nie udało się pobrać historii snu: ${error.message}`);
  return data ?? [];
}
