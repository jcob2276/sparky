import { TIMEZONE, SAUNA_WORKOUT_DAY_PATTERN } from '@vanguard/domain';
import { supabase } from '../supabase';
import { fetchDailyWinTasks } from '../dailyWinTasksApi';
import { getTodayWarsaw, shiftDateStr, warsawDayBoundsISO } from '../date';
import { nutritionSeries } from './nutritionDays';
import type { CialoRows, DuchRows, KontoRows } from './summaries';
import { RUN_SPORT_TYPES } from '../runSports';

/** Data kalendarzowa w Warszawie (wpis o 00:30 należy do nowego dnia, nie do poprzedniego dnia UTC). */
export function warsawDateKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(date);
}

/** Biegi liczone jak w tygodniowym pulsie ciała. */

function runKmByDay(rows: Array<{ start_date: string | null; distance: number | null }>): CialoRows['runKm'] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const date = row.start_date ? warsawDateKey(row.start_date) : '';
    if (date) byDay.set(date, (byDay.get(date) ?? 0) + (Number(row.distance) || 0) / 1000);
  }
  return [...byDay].map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
}

const num = (value: unknown): number | null => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));

/** Surowe dane do zakładki Ciało z okna `from..to` (razem z poprzednim okresem). */
export async function fetchCialoRows(userId: string, from: string, to: string): Promise<CialoRows> {
  const { fromISO } = warsawDayBoundsISO(from);
  const { fromISO: untilISO } = warsawDayBoundsISO(shiftDateStr(to, 1));
  const [body, nutrition, sleep, workouts, latestFat, runs] = await Promise.all([
    supabase.from('body_metrics').select('date, weight, body_fat').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('daily_nutrition').select('date, protein, calories, fiber, avg_food_quality').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('oura_daily_summary').select('date, total_sleep_hours, sleep_score, hrv_avg, rhr_avg, readiness_score').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('workout_sessions').select('date').eq('user_id', userId).gte('date', from).lte('date', to).not('workout_day', 'ilike', SAUNA_WORKOUT_DAY_PATTERN),
    supabase.from('body_metrics').select('date, body_fat').eq('user_id', userId).not('body_fat', 'is', null).order('date', { ascending: false }).limit(1),
    supabase.from('strava_activities_clean').select('start_date, distance, sport_type').eq('user_id', userId).eq('is_oura', false).in('sport_type', [...RUN_SPORT_TYPES]).gte('start_date', fromISO).lt('start_date', untilISO),
  ]);
  for (const result of [body, nutrition, sleep, workouts, latestFat, runs]) if (result.error) throw result.error;
  const today = getTodayWarsaw();
  const positive = (rows: Array<{ date: string }> | null, pick: (row: never) => unknown) =>
    (rows ?? []).flatMap((row) => { const value = num(pick(row as never)); return value != null && value > 0 ? [{ date: row.date, value }] : []; });
  const latest = latestFat.data?.[0];
  return {
    weight: (body.data ?? []).flatMap((row) => (row.date ? [{ date: row.date, value: num(row.weight) }] : [])),
    bodyFat: (body.data ?? []).flatMap((row) => (row.date ? [{ date: row.date, value: num(row.body_fat) }] : [])),
    protein: nutritionSeries(nutrition.data, today, (row) => row.protein),
    calories: nutritionSeries(nutrition.data, today, (row) => row.calories),
    fiber: nutritionSeries(nutrition.data, today, (row) => row.fiber),
    foodQuality: nutritionSeries(nutrition.data, today, (row) => row.avg_food_quality),
    sleepHours: (sleep.data ?? []).map((row) => ({ date: row.date, value: num(row.total_sleep_hours) })),
    sleepScore: positive(sleep.data, (row: { sleep_score: unknown }) => row.sleep_score),
    hrv: positive(sleep.data, (row: { hrv_avg: unknown }) => row.hrv_avg),
    restingHr: positive(sleep.data, (row: { rhr_avg: unknown }) => row.rhr_avg),
    readiness: positive(sleep.data, (row: { readiness_score: unknown }) => row.readiness_score),
    runKm: runKmByDay(runs.data ?? []),
    workouts: (workouts.data ?? []).filter((row) => row.date).map((row) => ({ date: row.date as string, value: 1 })),
    latestBodyFat: latest?.date && num(latest.body_fat) != null ? { date: latest.date, value: num(latest.body_fat) as number } : null,
  };
}

/** Zwycięstwa z Power List i dni z domknięciem z okna `from..to`. */
export async function fetchDuchRows(userId: string, from: string, to: string): Promise<DuchRows> {
  const { fromISO } = warsawDayBoundsISO(from);
  const { fromISO: untilISO } = warsawDayBoundsISO(shiftDateStr(to, 1));
  const [wins, scores, journal] = await Promise.all([
    fetchDailyWinTasks(userId, { from, to }),
    supabase.from('daily_reconciliations').select('date, day_score').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('vanguard_stream').select('timestamp').eq('user_id', userId).eq('source', 'telegram').gte('timestamp', fromISO).lt('timestamp', untilISO).limit(5000),
  ]);
  if (wins.error) throw wins.error;
  if (scores.error) throw scores.error;
  if (journal.error) throw journal.error;
  const tasks = (wins.data ?? []).flatMap(row => row.daily_win_tasks);
  const dateByWin = new Map((wins.data ?? []).map((row) => [row.id, row.date]));
  const entriesByDay = new Map<string, number>();
  for (const row of journal.data ?? []) {
    const date = row.timestamp ? warsawDateKey(row.timestamp) : '';
    if (date) entriesByDay.set(date, (entriesByDay.get(date) ?? 0) + 1);
  }
  return {
    dayScores: (scores.data ?? []).flatMap((row) => (row.date && num(row.day_score) != null ? [{ date: row.date, value: num(row.day_score) }] : [])),
    journal: [...entriesByDay].map(([date, value]) => ({ date, value })),
    wins: (wins.data ?? []).flatMap((row) => (row.date
      ? [{ date: row.date, result: row.result, mood: num(row.mood_score), hasNote: Boolean(row.day_note?.trim()) }]
      : [])),
    tasks: tasks.flatMap((row) => {
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
