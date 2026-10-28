import { shiftDateStr } from '../date';
import { supabase } from '../supabase';
import { TARGET_WINDOW_NIGHTS, type SleepRegularityRow } from './ouraSleepRegularity';

/** Read-only: nights from the last 60 days (14 for the chart, the rest for the personal sleep target). */
export async function fetchSleepRegularityRows(userId: string, todayDate: string): Promise<SleepRegularityRow[]> {
  const { data, error } = await supabase
    .from('oura_enhanced')
    .select('date,bedtime_start,bedtime_end,main_sleep_hours')
    .eq('user_id', userId)
    .gte('date', shiftDateStr(todayDate, -(TARGET_WINDOW_NIGHTS - 1)))
    .lte('date', todayDate)
    .order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
