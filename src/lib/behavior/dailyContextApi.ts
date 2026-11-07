import { supabase } from '../supabase';
import { unwrapList } from '../supabaseUtils';

/**
 * Szybki dzienny kontekst (alkohol, choroba, podróż, stres) zapisywany w `behavior_log`.
 * Klucze są dokładnie tymi, które silnik korelacji mapuje na serie (correlationSeries.ts):
 * alcohol → alcohol_units, sick → illness_day, travel → travel_day, stress → stress_manual.
 */
const DAILY_CONTEXT_KEYS =['alcohol', 'sick', 'travel', 'stress'] as const;
export type DailyContextKey = (typeof DAILY_CONTEXT_KEYS)[number];

export interface DailyContextRow {
  date: string;
  behavior_key: DailyContextKey;
  value: number;
}

export async function fetchDailyContext(userId: string, dates: string[]): Promise<DailyContextRow[]> {
  const rows = await unwrapList(await supabase
    .from('behavior_log')
    .select('date, behavior_key, value')
    .eq('user_id', userId)
    .in('behavior_key', [...DAILY_CONTEXT_KEYS])
    .in('date', dates));
  return rows.flatMap((r) => (r.value == null
    ? []
    : [{ date: r.date, behavior_key: r.behavior_key as DailyContextKey, value: Number(r.value) }]));
}

/** `value = null` usuwa wpis (powrót do "nie zalogowano"); każda liczba, także 0, jest jawnym logiem. */
export async function setDailyContext(
  userId: string,
  date: string,
  key: DailyContextKey,
  value: number | null,
): Promise<void> {
  if (value === null) {
    const { error } = await supabase
      .from('behavior_log')
      .delete()
      .eq('user_id', userId).eq('date', date).eq('behavior_key', key);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('behavior_log')
    .upsert({ user_id: userId, date, behavior_key: key, value }, { onConflict: 'user_id,date,behavior_key' });
  if (error) throw error;
}
