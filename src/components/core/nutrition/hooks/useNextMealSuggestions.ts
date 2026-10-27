import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PROTEIN_FLOOR_G } from '@vanguard/domain';
import { fetchMealMemories } from '../../../../lib/health/nutritionTrackerApi';
import { mealMemoryToDraft, rankMealMemoriesForGap, type MealDraftItem, type MealMemorySuggestion } from '../../../../lib/health/nutritionTracker';

const MIN_REMAINING_KCAL = 150;
const MAX_SUGGESTIONS = 3;

interface Params {
  userId: string | undefined;
  enabled: boolean;
  mealType: string;
  eatenKcal: number;
  eatenProtein: number;
  targetKcal: number | null;
  targetProtein: number | null;
  setDraftItems: (items: MealDraftItem[]) => void;
  setMemoryName: (name: string) => void;
}

/** „Co dalej”: znane Ci posiłki dopasowane do tego, co zostało z kalorii i białka dzisiaj. */
export function useNextMealSuggestions({
  userId, enabled, mealType, eatenKcal, eatenProtein, targetKcal, targetProtein, setDraftItems, setMemoryName,
}: Params) {
  const { data } = useQuery({
    queryKey: ['meal-memories', userId ?? ''],
    queryFn: () => fetchMealMemories(userId!),
    enabled: !!userId && enabled,
    staleTime: 5 * 60_000,
  });

  const remainingKcal = targetKcal == null ? 0 : Math.round(targetKcal - eatenKcal);
  const remainingProtein = Math.max(0, Math.round((targetProtein ?? DEFAULT_PROTEIN_FLOOR_G) - eatenProtein));

  const suggestions = useMemo<MealMemorySuggestion[]>(() => {
    if (!enabled || !data?.length || remainingKcal < MIN_REMAINING_KCAL) return [];
    return rankMealMemoriesForGap(data, { remainingCalories: remainingKcal, remainingProtein, mealType }).slice(0, MAX_SUGGESTIONS);
  }, [enabled, data, remainingKcal, remainingProtein, mealType]);

  const applySuggestion = useCallback((suggestion: MealMemorySuggestion) => {
    setDraftItems(mealMemoryToDraft(suggestion.items));
    setMemoryName(suggestion.name);
  }, [setDraftItems, setMemoryName]);

  return { suggestions, applySuggestion };
}
