import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw, getYesterdayWarsaw } from '../../../../lib/date';
import { fetchAllTodayEntries, type TodayFoodEntry } from '../../../../lib/health/composerTodayMealsApi';
import { buildYesterdayMealSuggestion } from './mealComposerCalc';

interface Params {
  userId: string | undefined;
  logDate: string;
  mealType: string;
  allTodayEntries: TodayFoodEntry[] | undefined;
}

export function useMealComposerYesterday({ userId, logDate, mealType, allTodayEntries }: Params) {
  const todayStr = useMemo(() => getTodayWarsaw(), []);
  const yesterdayStr = useMemo(() => getYesterdayWarsaw(), []);

  const yesterdayEntriesQuery = useQuery({
    queryKey: ['all-today-entries', userId, yesterdayStr],
    queryFn: () => fetchAllTodayEntries(userId!, yesterdayStr),
    enabled: !!userId && logDate === todayStr,
  });

  const yesterdayMealSuggestion = useMemo(() => {
    if (logDate !== todayStr || !yesterdayEntriesQuery.data?.length) return null;
    return buildYesterdayMealSuggestion(yesterdayEntriesQuery.data, allTodayEntries ?? [], mealType);
  }, [logDate, todayStr, yesterdayEntriesQuery.data, allTodayEntries, mealType]);

  return { todayStr, yesterdayMealSuggestion };
}
