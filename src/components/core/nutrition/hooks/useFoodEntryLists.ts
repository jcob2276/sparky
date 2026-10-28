import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFavorites, fetchRecent, fetchTodayTotals } from '../../../../lib/health/foodEntryListsApi';
import { fetchNutritionTargetForDay } from '../../../../lib/health/nutritionTargetsApi';

import { foodEntryListsKeys } from '../../../../lib/queryKeys';

async function fetchTargets(userId: string) {
  return (await fetchNutritionTargetForDay(userId)) ?? null;
}

export function useFoodEntryLists(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'favorites' | 'recent'>('favorites');

  const favQuery = useQuery({
    queryKey: foodEntryListsKeys.favorites(userId ?? ''),
    queryFn: () => fetchFavorites(userId!),
    enabled: !!userId,
  });

  const recentQuery = useQuery({
    queryKey: foodEntryListsKeys.recent(userId ?? ''),
    queryFn: () => fetchRecent(userId!),
    enabled: !!userId,
  });

  const todayQuery = useQuery({
    queryKey: foodEntryListsKeys.todayTotals(userId ?? ''),
    queryFn: () => fetchTodayTotals(userId!),
    enabled: !!userId,
  });

  const targetsQuery = useQuery({
    queryKey: foodEntryListsKeys.targets(userId ?? ''),
    queryFn: () => fetchTargets(userId!),
    enabled: !!userId,
  });

  const loadLists = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: foodEntryListsKeys.all });
  }, [queryClient, userId]);

  return {
    activeTab,
    setActiveTab,
    favorites: favQuery.data ?? [],
    setFavorites: () => { /* managed by react-query */ },
    recent: recentQuery.data ?? [],
    setRecent: () => { /* managed by react-query */ },
    loadingList: favQuery.isLoading || recentQuery.isLoading,
    todayTotals: todayQuery.data ?? null,
    targets: targetsQuery.data ?? null,
    loadLists,
  };
}
