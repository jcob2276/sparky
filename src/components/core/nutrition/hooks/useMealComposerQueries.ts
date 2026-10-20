import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNutritionDayContext } from '../../../../lib/health/nutritionContext';
import { fetchComposerTodayMeals, fetchAllTodayEntries } from '../../../../lib/health/composerTodayMealsApi';
import { fetchRecentFoodProducts } from '../../../../lib/health/recentFoodProductsApi';
import { fetchUserPortions } from '../../../../lib/health/userPortionsApi';
import type { useSession } from '../../../../store/useStore';
import { computeComposerTotals } from './mealComposerCalc';

interface Params {
  session: ReturnType<typeof useSession>;
  userId: string | undefined;
  logDate: string;
  mealType: string;
  refreshSignal: number;
}

export function useMealComposerQueries({ session, userId, logDate, mealType, refreshSignal }: Params) {
  const queryClient = useQueryClient();

  const contextQuery = useQuery({
    queryKey: ['nutrition-context', userId, logDate],
    queryFn: () => fetchNutritionDayContext(userId!, logDate, session!.access_token),
    enabled: !!userId,
  });

  const userPortionsQuery = useQuery({
    queryKey: ['user-portions', userId],
    queryFn: () => fetchUserPortions(userId!),
    enabled: !!userId,
  });

  const recentProductsQuery = useQuery({
    queryKey: ['recent-food-products', userId],
    queryFn: () => fetchRecentFoodProducts(userId!, 8),
    enabled: !!userId,
  });

  const todayMealsQuery = useQuery({
    queryKey: ['composer-today-meals', userId, logDate, mealType],
    queryFn: () => fetchComposerTodayMeals(userId!, logDate, mealType),
    enabled: !!userId,
  });

  const allTodayEntriesQuery = useQuery({
    queryKey: ['all-today-entries', userId, logDate],
    queryFn: () => fetchAllTodayEntries(userId!, logDate),
    enabled: !!userId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
  });

  useEffect(() => {
    if (!refreshSignal || !userId) return;
    void queryClient.invalidateQueries({ queryKey: ['nutrition-context', userId, logDate] });
    void queryClient.invalidateQueries({ queryKey: ['user-portions', userId] });
    void queryClient.invalidateQueries({ queryKey: ['recent-food-products', userId] });
    void queryClient.invalidateQueries({ queryKey: ['composer-today-meals', userId, logDate] });
    void queryClient.invalidateQueries({ queryKey: ['all-today-entries', userId] });
  }, [refreshSignal, queryClient, userId, logDate]);

  const totals = useMemo(
    () => computeComposerTotals(contextQuery.data, allTodayEntriesQuery.data),
    [allTodayEntriesQuery.data, contextQuery.data],
  );

  return { contextQuery, userPortionsQuery, recentProductsQuery, todayMealsQuery, allTodayEntriesQuery, totals };
}
