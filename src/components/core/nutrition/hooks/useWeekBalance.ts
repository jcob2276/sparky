import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw, getWeekStartWarsaw } from '../../../../lib/date';
import { computeWeekBalance, type WeekBalance } from '../../../../lib/health/weekBalance';
import { fetchWeekBalanceRows } from '../../../../lib/health/weekBalanceApi';

/**
 * Bilans tygodnia pon–nd dla dnia, który właśnie logujesz. Kcal wybranego dnia bierze na żywo
 * z kompozytora (zapisy w bazie dochodzą z opóźnieniem), resztę tygodnia z bazy.
 */
export function useWeekBalance(
  userId: string | undefined,
  logDate: string,
  liveCalories: number,
  fallbackTarget: number | null,
): WeekBalance | null {
  const weekStart = getWeekStartWarsaw(logDate);
  const { data } = useQuery({
    queryKey: ['week-balance', userId ?? '', weekStart],
    queryFn: () => fetchWeekBalanceRows(userId!, weekStart),
    enabled: !!userId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  });

  return useMemo(() => {
    if (!data) return null;
    return computeWeekBalance({
      weekStart,
      today: getTodayWarsaw(),
      eatenByDate: { ...data.eatenByDate, [logDate]: liveCalories },
      targetByDate: data.targetByDate,
      completenessByDate: data.completenessByDate,
      fallbackTarget,
    });
  }, [data, weekStart, logDate, liveCalories, fallbackTarget]);
}
