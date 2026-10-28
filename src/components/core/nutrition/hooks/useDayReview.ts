import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNutritionDayReviews, saveNutritionDayReview } from '../../../../lib/health/nutritionTrackerApi';
import type { NutritionDayCompleteness } from '../../../../lib/health/nutritionTracker';
import { notify } from '../../../../lib/notify';

export interface DayReview {
  status: NutritionDayCompleteness;
  saving: boolean;
  setStatus: (next: NutritionDayCompleteness) => void;
}

/** Twoja decyzja „ten dzień jest w dzienniku pełny”; zasila bilans tygodnia i kalibrację energii. */
export function useDayReview(userId: string | undefined, date: string): DayReview {
  const queryClient = useQueryClient();
  const key = ['nutrition-day-review', userId ?? '', date];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => (await fetchNutritionDayReviews(userId!, date)).find((row) => row.date === date)?.completeness ?? 'unknown',
    enabled: !!userId,
  });
  const mutation = useMutation({
    mutationFn: (next: NutritionDayCompleteness) => saveNutritionDayReview(userId!, date, next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NutritionDayCompleteness>(key);
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      queryClient.setQueryData(key, context?.previous ?? 'unknown');
      notify(`Nie udało się zapisać kompletności dnia: ${error.message}`, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['week-balance'] });
      void queryClient.invalidateQueries({ queryKey: ['nutrition-data', userId] });
    },
  });
  return { status: data ?? 'unknown', saving: mutation.isPending, setStatus: (next) => mutation.mutate(next) };
}
