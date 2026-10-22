import { supabase } from '../../supabase';
import { getTodayWarsaw, shiftDateStr, warsawDayBoundsISO } from '../../date';
import type { SleepDriversInput } from './inputTypes';
import { mapFood, mapNights, mapPc, mapPhone, mapSessions, mapTop5 } from './mapRows';

/** Okno analizy: ~13 miesięcy wstecz, jedno równoległe zestawienie zapytań. */
const SLEEP_DRIVERS_WINDOW_DAYS = 400;
const PAGE = 1000;

interface QueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

function unwrapRows<T>(source: string, result: QueryResult<T>): T[] {
  if (result.error) throw new Error(`${source}: ${result.error.message}`);
  return result.data ?? [];
}

/** Domyślny limit PostgREST to 1000 wierszy; wpisy jedzenia mogą go przekroczyć. */
async function fetchAllRows<T>(source: string, page: (from: number, to: number) => PromiseLike<QueryResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const chunk = unwrapRows(source, await page(from, from + PAGE - 1));
    rows.push(...chunk);
    if (chunk.length < PAGE) return rows;
  }
}

/** Tylko odczyt. Predyktory wieczorne dnia D-1 => zapytania sięgają o 1 dzień przed oknem. */
export async function fetchSleepDriversInput(userId: string): Promise<SleepDriversInput> {
  const since = shiftDateStr(getTodayWarsaw(), -SLEEP_DRIVERS_WINDOW_DAYS);
  const sinceDayBefore = shiftDateStr(since, -1);
  const fromISO = warsawDayBoundsISO(sinceDayBefore).fromISO;

  const [enhanced, summary, food, workouts, garmin, phone, pc, wins] = await Promise.all([
    supabase.from('oura_enhanced')
      .select('date,sleep_score,total_sleep_hours,deep_sleep_hours,sleep_efficiency,sleep_average_hrv,sleep_latency_minutes,bedtime_start')
      .eq('user_id', userId).gte('date', since),
    supabase.from('oura_daily_summary')
      .select('date,sleep_score,total_sleep_hours,deep_sleep_hours,sleep_efficiency,hrv_avg,latency_minutes,bedtime_timestamp')
      .eq('user_id', userId).gte('date', since),
    fetchAllRows('daily_food_entries', (from, to) => supabase.from('daily_food_entries')
      .select('name,logged_at').eq('user_id', userId).gte('logged_at', fromISO)
      .order('logged_at').order('id').range(from, to)),
    supabase.from('workout_sessions')
      .select('workout_day,start_time,end_time,duration_minutes')
      .eq('user_id', userId).gte('start_time', fromISO),
    // historyczna nazwa tabeli; aktywne źródło to Garmin (source='garmin_intervals')
    supabase.from('strava_activities')
      .select('start_date,elapsed_time,sport_type,name').eq('user_id', userId)
      .eq('source', 'garmin_intervals').gte('start_date', fromISO),
    supabase.from('phone_usage_daily').select('*').eq('user_id', userId).gte('date', sinceDayBefore),
    supabase.from('aw_daily_summary')
      .select('date,total_active_seconds').eq('user_id', userId).gte('date', sinceDayBefore),
    supabase.from('daily_wins')
      .select('date,daily_win_tasks(done)').eq('user_id', userId).gte('date', since),
  ]);

  const { training, sauna } = mapSessions(
    unwrapRows('workout_sessions', workouts).flatMap((w) => (w.workout_day ? [{ ...w, workout_day: w.workout_day }] : [])),
    unwrapRows('strava_activities', garmin),
  );
  return {
    nights: mapNights(unwrapRows('oura_enhanced', enhanced), unwrapRows('oura_daily_summary', summary)),
    food: mapFood(food),
    training,
    sauna,
    phone: mapPhone(unwrapRows('phone_usage_daily', phone)),
    pc: mapPc(unwrapRows('aw_daily_summary', pc)),
    top5: mapTop5(unwrapRows('daily_wins', wins).flatMap((w) => (w.date ? [{ ...w, date: w.date }] : []))),
  };
}
