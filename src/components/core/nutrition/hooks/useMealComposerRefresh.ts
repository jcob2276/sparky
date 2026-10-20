import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';

interface Params {
  queryClient: QueryClient;
  contextQuery: Pick<UseQueryResult, 'refetch'>;
  userId: string | undefined;
  logDate: string;
  mealType: string;
  onSaved?: () => void;
  setQualityPending: Dispatch<SetStateAction<boolean>>;
}

/** Cache invalidation after a meal is saved/copied/deleted, plus the delayed food-quality refresh. */
export function useMealComposerRefresh({
  queryClient, contextQuery, userId, logDate, mealType, onSaved, setQualityPending,
}: Params) {
  const bumpQualityRefresh = useCallback(() => {
    setQualityPending(true);
    window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['nutrition-context', userId, logDate] })
        .then(() => setQualityPending(false));
    }, 8000);
  }, [queryClient, userId, logDate, setQualityPending]);

  return useCallback(async () => {
    await contextQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: ['nutrition-meal-memories', userId] });
    void queryClient.invalidateQueries({ queryKey: ['meal-composer-yesterday', userId, mealType] });
    void queryClient.invalidateQueries({ queryKey: ['recent-food-products', userId] });
    void queryClient.invalidateQueries({ queryKey: ['user-portions', userId] });
    void queryClient.invalidateQueries({ queryKey: ['composer-today-meals', userId, logDate, mealType] });
    void queryClient.invalidateQueries({ queryKey: ['all-today-entries', userId, logDate] });
    bumpQualityRefresh();
    onSaved?.();
  }, [bumpQualityRefresh, contextQuery, logDate, mealType, onSaved, queryClient, userId]);
}
