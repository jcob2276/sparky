import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw, getWeekStartWarsaw } from '../../../../lib/date';
import { computeWeekBalance, type WeekBalance } from '../../../../lib/health/weekBalance';
import { fetchWeekBalanceRows } from '../../../../lib/health/weekBalanceApi';
import { computeWeekMacros, type DayMacros } from '../../../../lib/health/weekMacros';

/** Makra wybranego dnia na żywo z kompozytora oraz cele dnia używane, gdy tydzień nie ma zapisanych celów. */
export interface LiveMacros { eaten: DayMacros; targets: DayMacros }

/**
 * Bilans tygodnia pon–nd dla dnia, który właśnie logujesz. Kcal wybranego dnia bierze na żywo
 * z kompozytora (zapisy w bazie dochodzą z opóźnieniem), resztę tygodnia z bazy.
 */
export function useWeekBalance(
  userId: string | undefined,
  logDate: string,
  liveCalories: number,
  fallbackTarget: number | null,
  live?: LiveMacros,
): WeekBalance | null {
  const weekStart = getWeekStartWarsaw(logDate);
  const hasLive = live != null;
  const eatenProtein = live?.eaten.protein, eatenFat = live?.eaten.fat, eatenCarbs = live?.eaten.carbs;
  const targetProtein = live?.targets.protein, targetFat = live?.targets.fat, targetCarbs = live?.targets.carbs;
  const { data } = useQuery({
    queryKey: ['week-balance', userId ?? '', weekStart],
    queryFn: () => fetchWeekBalanceRows(userId!, weekStart),
    enabled: !!userId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  });

  return useMemo(() => {
    if (!data) return null;
    const balance = computeWeekBalance({
      weekStart,
      today: getTodayWarsaw(),
      eatenByDate: { ...data.eatenByDate, [logDate]: liveCalories },
      targetByDate: data.targetByDate,
      completenessByDate: data.completenessByDate,
      fallbackTarget,
    });
    if (!balance) return null;
    const macros = computeWeekMacros({
      weekStart,
      today: getTodayWarsaw(),
      eatenByDate: { ...data.eatenMacrosByDate, ...(hasLive ? { [logDate]: { protein: eatenProtein, fat: eatenFat, carbs: eatenCarbs } } : {}) },
      targetByDate: data.targetMacrosByDate,
      fallback: { protein: targetProtein, fat: targetFat, carbs: targetCarbs },
    });
    return Object.keys(macros).length ? { ...balance, macros } : balance;
  }, [data, weekStart, logDate, liveCalories, fallbackTarget, hasLive, eatenProtein, eatenFat, eatenCarbs, targetProtein, targetFat, targetCarbs]);
}
