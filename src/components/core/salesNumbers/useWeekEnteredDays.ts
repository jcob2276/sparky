import { useQuery } from '@tanstack/react-query';
import { fetchCloserWeekLogs } from '../../../lib/closer/closerApi';
import { hasEnteredNumbers } from '../../../lib/closer/closerDayModel';
import { shiftDateStr } from '../../../lib/date';
import { closerKeys } from '../../../lib/queryKeys';

/** Ile dni tygodnia od poniedziałku do wczoraj nie ma wpisanych liczb sprzedaży (dzisiaj jeszcze się liczy). */
export function useWeekEnteredDays(userId: string | null | undefined, weekStart: string, today: string) {
  const query = useQuery({
    queryKey: closerKeys.week(userId ?? '', weekStart),
    queryFn: () => fetchCloserWeekLogs(userId!, weekStart),
    enabled: !!userId,
  });
  const rows = query.data ?? [];
  const pastDays = Array.from({ length: 7 }, (_, i) => shiftDateStr(weekStart, i)).filter((date) => date < today);
  const missingDays = pastDays.filter((date) => !hasEnteredNumbers(rows.find((row) => row.date === date))).length;
  return { missingDays };
}
