import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getTodayWarsaw, shiftDateStr, warsawDayBoundsISO } from '../date';
import { buildRunningLoad, type RunningLoad } from './runningLoad';

/** Biegi z Garmina/Stravy z ostatnich 5 tygodni: obciążenie liczone z tętna (do Centrum Treningowego i mapy zmęczenia). */
export function useRunningLoad(userId: string | undefined) {
  const today = getTodayWarsaw();
  return useQuery<RunningLoad>({
    queryKey: ['running-load', 'hr-v2', userId, today],
    enabled: Boolean(userId),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { fromISO } = warsawDayBoundsISO(shiftDateStr(today, -34));
      const { data, error } = await supabase
        .from('strava_activities')
        .select('start_date, distance, moving_time, sport_type, hr_avg, hr_max')
        .eq('user_id', userId as string)
        .gte('start_date', fromISO);
      if (error) throw new Error(error.message);
      return buildRunningLoad(data ?? [], today);
    },
  });
}
