import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getTodayWarsaw } from '../date';
import { warsawDateKey } from '../chronicle/chronicleApi';
import { buildMarkerContext, contextWindow, type MarkerContext, type MarkerContextKind, type MarkerContextRows } from './markerContext';

const RUN_SPORTS = ['Run', 'TrailRun', 'VirtualRun'];

const num = (value: unknown): number | null => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));

async function fetchMarkerContextRows(userId: string, from: string, to: string): Promise<MarkerContextRows> {
  const [runs, workouts, sleep, nutrition] = await Promise.all([
    supabase.from('strava_activities_clean').select('start_date, distance').eq('user_id', userId).eq('is_oura', false).in('sport_type', RUN_SPORTS).gte('start_date', `${from}T00:00:00Z`).lte('start_date', `${to}T23:59:59Z`),
    supabase.from('workout_sessions').select('date').eq('user_id', userId).gte('date', from).lte('date', to).not('workout_day', 'ilike', '%sauna%'),
    supabase.from('oura_daily_summary').select('date, total_sleep_hours, hrv_avg').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('daily_nutrition').select('date, calories, protein').eq('user_id', userId).gte('date', from).lte('date', to),
  ]);
  for (const result of [runs, workouts, sleep, nutrition]) if (result.error) throw result.error;
  return {
    runKm: (runs.data ?? []).flatMap((r) => {
      const date = r.start_date ? warsawDateKey(r.start_date) : '';
      return date ? [{ date, value: (num(r.distance) ?? 0) / 1000 }] : [];
    }),
    strengthDates: (workouts.data ?? []).flatMap((r) => (r.date ? [r.date] : [])),
    sleep: (sleep.data ?? []).map((r) => ({ date: r.date, hours: num(r.total_sleep_hours), hrv: num(r.hrv_avg) })),
    nutrition: (nutrition.data ?? []).map((r) => ({ date: r.date, calories: num(r.calories), protein: num(r.protein) })),
  };
}

/** Trening, sen albo jedzenie z okresu przed badaniem; tylko dla markerów, które mają sensowny kontekst. */
export function useMarkerContext(userId: string | undefined, kind: MarkerContextKind | null, resultDate: string | undefined) {
  return useQuery<MarkerContext | null>({
    queryKey: ['marker-context', userId, kind, resultDate],
    enabled: Boolean(userId && kind && resultDate),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      if (!userId || !kind || !resultDate) return null;
      const { from, to } = contextWindow(kind, resultDate);
      const rows = await fetchMarkerContextRows(userId, from, to);
      return buildMarkerContext(kind, rows, resultDate, getTodayWarsaw());
    },
  });
}
