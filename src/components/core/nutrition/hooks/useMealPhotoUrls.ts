import { useQuery } from '@tanstack/react-query';
import { fetchMealPhotoUrls } from '../../../../lib/health/mealPhotoStore';
import type { TodayFoodEntry } from '../../../../lib/health/composerTodayMealsApi';

const URL_STALE_MS = 30 * 60 * 1000;

/** Signed photo URLs for the meals in `entries`, keyed by meal_group_id. */
export function useMealPhotoUrls(userId: string | undefined, entries: TodayFoodEntry[]): Record<string, string> {
  const groupIds = [...new Set(entries.map((entry) => entry.meal_group_id).filter((id): id is string => !!id))].sort();
  const query = useQuery({
    queryKey: ['meal-photo-urls', userId, groupIds],
    queryFn: () => fetchMealPhotoUrls(userId!, groupIds),
    enabled: !!userId && groupIds.length > 0,
    staleTime: URL_STALE_MS,
  });
  return query.data ?? {};
}
