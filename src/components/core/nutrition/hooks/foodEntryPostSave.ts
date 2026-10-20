import { useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getTodayWarsaw } from '../../../../lib/date';
import { scheduleFoodQualityAnalysis } from '../../../../lib/health/nutritionSideEffects';
import type { FoodBase } from './foodEntryUtils';

/** Side effects that run after a food entry has been logged online. */
export function useFoodEntryPostSave(userId: string | undefined) {
  const afterFoodLog = useCallback(() => {
    if (userId) scheduleFoodQualityAnalysis(userId, getTodayWarsaw());
  }, [userId]);

  const cacheToLibrary = useCallback(
    (food: FoodBase, defaultGrams: number) => {
      if (!userId) return;
      supabase
        .rpc('cache_food_to_library', {
          p_user_id: userId,
          p_name: food.name,
          p_brand: food.brand,
          p_barcode: food.barcode,
          p_calories: food.calories,
          p_protein: food.protein,
          p_carbs: food.carbs,
          p_fat: food.fat,
          p_fiber: food.fiber,
          p_sugar: food.sugar,
          p_default_grams: defaultGrams,
        } as never)
        .then(({ error }) => {
          if (error) {
            console.error('[FoodEntryModal] cacheToLibrary failed', error);
          }
        });
    },
    [userId]
  );

  return { afterFoodLog, cacheToLibrary };
}
