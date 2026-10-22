import { supabase } from '../supabase';
import type { CialoRows, DuchRows, KontoRows } from './summaries';

const num = (value: unknown): number | null => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));

/** Surowe dane do zakładki Ciało z okna `from..to` (razem z poprzednim okresem). */
export async function fetchCialoRows(userId: string, from: string, to: string): Promise<CialoRows> {
  const [body, nutrition, sleep, workouts, latestFat] = await Promise.all([
    supabase.from('body_metrics').select('date, weight, body_fat').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('daily_nutrition').select('date, protein').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('oura_daily_summary').select('date, total_sleep_hours').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('workout_sessions').select('date').eq('user_id', userId).gte('date', from).lte('date', to).not('workout_day', 'ilike', '%sauna%'),
    supabase.from('body_metrics').select('date, body_fat').eq('user_id', userId).not('body_fat', 'is', null).order('date', { ascending: false }).limit(1),
  ]);
  for (const result of [body, nutrition, sleep, workouts, latestFat]) if (result.error) throw result.error;
  const latest = latestFat.data?.[0];
  return {
    weight: (body.data ?? []).flatMap((row) => (row.date ? [{ date: row.date, value: num(row.weight) }] : [])),
    bodyFat: (body.data ?? []).flatMap((row) => (row.date ? [{ date: row.date, value: num(row.body_fat) }] : [])),
    protein: (nutrition.data ?? []).filter((row) => (num(row.protein) ?? 0) > 0).map((row) => ({ date: row.date, value: num(row.protein) })),
    sleepHours: (sleep.data ?? []).map((row) => ({ date: row.date, value: num(row.total_sleep_hours) })),
    workouts: (workouts.data ?? []).filter((row) => row.date).map((row) => ({ date: row.date as string, value: 1 })),
    latestBodyFat: latest?.date && num(latest.body_fat) != null ? { date: latest.date, value: num(latest.body_fat) as number } : null,
  };
}

/** Zwycięstwa z Power List i dni z domknięciem z okna `from..to`. */
export async function fetchDuchRows(userId: string, from: string, to: string): Promise<DuchRows> {
  const [wins, tasks] = await Promise.all([
    supabase.from('daily_wins').select('id, date, result, mood_score, day_note').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('daily_win_tasks').select('done, category, day_win_id').eq('user_id', userId).gte('created_at', `${from}T00:00:00Z`).limit(5000),
  ]);
  if (wins.error) throw wins.error;
  if (tasks.error) throw tasks.error;
  const dateByWin = new Map((wins.data ?? []).map((row) => [row.id, row.date]));
  return {
    wins: (wins.data ?? []).flatMap((row) => (row.date
      ? [{ date: row.date, result: row.result, mood: num(row.mood_score), hasNote: Boolean(row.day_note?.trim()) }]
      : [])),
    tasks: (tasks.data ?? []).flatMap((row) => {
      const date = dateByWin.get(row.day_win_id);
      return date ? [{ date, done: Boolean(row.done), category: row.category }] : [];
    }),
  };
}

/** Dzienne liczby sprzedaży z okna `from..to`. */
export async function fetchKontoRows(userId: string, from: string, to: string): Promise<KontoRows> {
  const { data, error } = await supabase
    .from('closer_daily_logs')
    .select('date, dials, appointments, sales_calls, sales_closed')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  return {
    logs: (data ?? []).map((row) => ({
      date: row.date,
      dials: row.dials ?? 0,
      appointments: row.appointments ?? 0,
      sales_calls: row.sales_calls ?? 0,
      sales_closed: row.sales_closed ?? 0,
    })),
  };
}
