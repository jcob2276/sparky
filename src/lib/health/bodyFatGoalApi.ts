import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getTodayWarsaw, shiftDateStr } from '../date';
import { GOAL_BODY_FAT_PCT } from '../lifeGoals';
import { buildBodyFatGoal, type BodyFatGoal, type DatedPoint } from './bodyFatGoal';


const HISTORY_DAYS = 180;

const num = (value: unknown): number | null => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));

function series(rows: Array<{ date: string | null }>, pick: (row: never) => unknown): DatedPoint[] {
  return rows.flatMap((row) => {
    const value = num(pick(row as never));
    return row.date && value != null && value > 0 ? [{ date: row.date, value }] : [];
  });
}

/** Cel tłuszczu z ustawień (nutrition_profile), a gdy go nie ma, 15%; historia pomiarów z ostatnich 6 miesięcy. */
export function useBodyFatGoal(userId: string | undefined) {
  return useQuery<BodyFatGoal>({
    queryKey: ['body-fat-goal', userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const today = getTodayWarsaw();
      const [metrics, profile] = await Promise.all([
        supabase.from('body_metrics').select('date, weight, waist, body_fat').eq('user_id', userId as string).gte('date', shiftDateStr(today, -HISTORY_DAYS)).order('date', { ascending: true }),
        supabase.from('nutrition_profile').select('goal_body_fat').eq('user_id', userId as string).maybeSingle(),
      ]);
      if (metrics.error) throw metrics.error;
      const rows = metrics.data ?? [];
      const goal = num(profile.data?.goal_body_fat) ?? GOAL_BODY_FAT_PCT;
      return buildBodyFatGoal({
        bf: series(rows, (r: { body_fat: unknown }) => r.body_fat),
        weight: series(rows, (r: { weight: unknown }) => r.weight),
        waist: series(rows, (r: { waist: unknown }) => r.waist),
        goal,
        today,
      });
    },
  });
}
