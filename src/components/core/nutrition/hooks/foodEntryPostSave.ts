import { useCallback } from 'react';
import { cacheFoodToLibrary } from '../../../../lib/health/foodLibraryApi';
import { getTodayWarsaw } from '../../../../lib/date';
import { scheduleNutritionRefresh } from '../../../../lib/health/nutritionSideEffects';
import type { FoodBase } from './foodEntryUtils';

/** Side effects that run after a food entry has been logged online. */
export function useFoodEntryPostSave(userId: string | undefined) {
  const afterFoodLog = useCallback(() => {
    if (userId) scheduleNutritionRefresh(userId, getTodayWarsaw());
  }, [userId]);

  const cacheToLibrary = useCallback(
    (food: FoodBase, defaultGrams: number) => {
      if (!userId) return;
      void cacheFoodToLibrary(userId, food, defaultGrams).catch((error) => {
        console.error('[FoodEntryModal] cacheToLibrary failed', error);
      });
    },
    [userId]
  );

  return { afterFoodLog, cacheToLibrary };
}
