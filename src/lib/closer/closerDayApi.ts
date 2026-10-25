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
 * Zapisuje cztery liczby i opinię dnia; zachowuje zapisany czas pracy.
 * Energia i presja nie są edytowane przez formularz liczb.
 */
export async function saveCloserDayNumbers(
  userId: string,
  date: string,
  numbers: DayNumbers,
): Promise<CloserDailyLogRow> {
  const existing = await fetchCloserDay(userId, date);
  return upsertCloserDailyLog(userId, getWeekStartWarsaw(date), {
    date,
    numbers_entered_at: new Date().toISOString(),
    dials: numbers.dials,
    appointments: numbers.appointments,
    sales_calls: numbers.salesCalls,
    sales_closed: numbers.salesClosed,
    work_hours: Number(existing?.work_hours ?? 0),
    notes: numbers.note,
  });
}

/** Context-only upsert: omitted numeric fields are not overwritten on conflict. */
export async function saveCloserWorkContext(userId: string, date: string, context: import('./closerWorkContext').WorkContext): Promise<CloserDailyLogRow> {
  const validRating = (value: number | null) => value === null || (Number.isInteger(value) && value >= 1 && value <= 5);
  if (!validRating(context.work_energy) || !validRating(context.work_pressure)) throw new Error('Ocena musi mieścić się w skali 1–5.');
  if (context.notes.length > 10000) throw new Error('Notatka jest za długa.');
  const { data, error } = await supabase.from('closer_daily_logs').upsert({
    user_id: userId, date, ...context, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' }).select().single();
  if (error) throw error;
  return data;
}
