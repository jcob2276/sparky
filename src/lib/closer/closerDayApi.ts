import { supabase } from '../supabase';
import { getWeekStartWarsaw } from '../growth/growth';
import { upsertCloserDailyLog, type CloserDailyLogRow } from './closerApi';
import type { DayNumbers } from './closerDayModel';

export async function fetchCloserDay(userId: string, date: string): Promise<CloserDailyLogRow | null> {
  const { data, error } = await supabase
    .from('closer_daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Zapisuje cztery liczby i opinię dnia. `upsertCloserDailyLog` zeruje pominięte pola,
 * więc godziny pracy z istniejącego wiersza przenosimy jawnie (ich nie edytujemy tutaj).
 */
export async function saveCloserDayNumbers(
  userId: string,
  date: string,
  numbers: DayNumbers,
): Promise<CloserDailyLogRow> {
  const existing = await fetchCloserDay(userId, date);
  return upsertCloserDailyLog(userId, getWeekStartWarsaw(date), {
    date,
    dials: numbers.dials,
    appointments: numbers.appointments,
    sales_calls: numbers.salesCalls,
    sales_closed: numbers.salesClosed,
    work_hours: Number(existing?.work_hours ?? 0),
    notes: numbers.note,
  });
}
