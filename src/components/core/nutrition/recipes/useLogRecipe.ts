import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../../lib/date';
import { notify } from '../../../../lib/notify';
import { confirmMealCapture } from '../../../../lib/health/nutritionTrackerApi';
import { confirmIfRecentDuplicate } from '../../../../lib/health/recentDuplicate';
import { scheduleNutritionRefresh } from '../../../../lib/health/nutritionSideEffects';
import { recipeMealType, recipeToMealItem } from '../../../../lib/recipes/recipeToMealItem';
import type { Recipe } from '../../../../lib/recipes/recipeTypes';

/** Zapisuje porcję przepisu jako dzisiejszy posiłek (szacunek makro, ta sama ścieżka co reszta zapisów). */
export function useLogRecipe(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  const logRecipe = useCallback(async (recipe: Recipe): Promise<boolean> => {
    if (!userId || lock.current) return false;
    lock.current = true;
    setSaving(true);
    try {
      const date = getTodayWarsaw();
      if (!await confirmIfRecentDuplicate(userId, date, [recipe.title])) return false;
      await confirmMealCapture({
        userId,
        date,
        mealType: recipeMealType(recipe),
        source: 'search',
        items: [recipeToMealItem(recipe)],
        captureId: crypto.randomUUID(),
      });
      scheduleNutritionRefresh(userId, date);
      void queryClient.invalidateQueries({ queryKey: ['all-today-entries', userId, date] });
      void queryClient.invalidateQueries({ queryKey: ['nutrition-context', userId, date] });
      notify(`Zapisano: ${recipe.title}`, 'success');
      return true;
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się zapisać posiłku', 'error');
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }, [userId, queryClient]);

  return { logRecipe, saving };
}
