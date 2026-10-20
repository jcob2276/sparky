import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCloserWeekLogs } from '../../../lib/closer/closerApi';
import { sumWeek } from '../../../lib/closer/closerDayModel';
import { closerKeys } from '../../../lib/queryKeys';

/** Sumy tygodnia (umówieni, sales calle, rozmowy) z dziennych logów sprzedaży. */
export function useWeekSalesSums(userId: string | null | undefined, weekStart: string) {
  const query = useQuery({
    queryKey: closerKeys.week(userId ?? '', weekStart),
    queryFn: () => fetchCloserWeekLogs(userId!, weekStart),
    enabled: !!userId,
  });
  const sums = useMemo(() => sumWeek(query.data ?? []), [query.data]);
  return { sums, loading: query.isLoading, error: query.error };
}
