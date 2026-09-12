import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useUserId } from '../../../store/useStore';

/**
 * Fetches day_score (1–10) from daily_reconciliations for each day in a week.
 * Returns a map of { [dateISO]: score | null }.
 */
export function useWeekDayScores(weekDays: string[]): Record<string, number | null> {
  const from = weekDays[0];
  const to = weekDays[weekDays.length - 1];
  const userId = useUserId();

  const { data } = useQuery({
    queryKey: ['week-day-scores', from, to, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: rows } = await supabase
        .from('daily_reconciliations')
        .select('date, day_score')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to);
      return rows ?? [];
    },
    enabled: weekDays.length > 0 && Boolean(userId),
    staleTime: 5 * 60_000,
  });

  const map: Record<string, number | null> = {};
  for (const day of weekDays) map[day] = null;
  for (const row of data ?? []) {
    if (row.date in map) map[row.date] = row.day_score ?? null;
  }
  return map;
}
