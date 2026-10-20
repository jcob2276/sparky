import { useCallback } from 'react';
import { foodTrustMeta } from '../../../../lib/health/foodTrust';
import {
  type FoodBase,
  type Favorite,
  type RecentEntry,
  parseGrams,
  derivePer100,
} from './foodEntryUtils';
import {
  addFoodEntryRpc,
  buildFoodEntryPayload,
  toSaveErrorMessage,
} from './foodEntryAddRpc';
import { useFoodEntryPostSave } from './foodEntryPostSave';

interface UseFoodEntryActionsOptions {
  userId: string | undefined;
  mealType: string;
  saving: boolean;
  setSaving: (v: boolean) => void;
  quickAddingId: string | null;
  setQuickAddingId: (v: string | null) => void;
  setError: (msg: string | null) => void;
  search: {
    selected: FoodBase | null;
    setSelected: (v: FoodBase | null) => void;
    grams: string;
    setGrams: (v: string) => void;
    setQuery: (v: string) => void;
  };
  lists: {
    loadLists: () => Promise<void>;
  };
  flashSaved: () => void;
  onSaved?: () => void;
}

export function useFoodEntryActions({
  userId,
  mealType,
  saving,
  setSaving,
  quickAddingId,
  setQuickAddingId,
  setError,
  search,
  lists,
  flashSaved,
  onSaved,
}: UseFoodEntryActionsOptions) {

  const { afterFoodLog, cacheToLibrary } = useFoodEntryPostSave(userId);

  const save = useCallback(async () => {
    if (!search.selected || !userId || saving) return;
    const gramsNum = parseInt(search.grams, 10) || 100;
    setSaving(true);
    setError(null);
    try {
      const queued = await addFoodEntryRpc(
        userId,
        gramsNum,
        buildFoodEntryPayload(
          search.selected,
          mealType,
          foodTrustMeta(search.selected)
        )
      );
      if (!queued) {
        cacheToLibrary(search.selected, gramsNum);
        afterFoodLog();
      }
      flashSaved();
      onSaved?.();
      search.setSelected(null);
      search.setQuery('');
      search.setGrams('100');
      await lists.loadLists();
    } catch (err: unknown) {
      setError(toSaveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [
    search,
    userId,
    mealType,
    saving,
    setSaving,
    setError,
    onSaved,
    lists,
    flashSaved,
    cacheToLibrary,
    afterFoodLog,
  ]);

  const quickAddSearchResult = useCallback(
    async (food: FoodBase) => {
      if (!userId || quickAddingId) return;
      const key = `srch:${food.name}`;
      setQuickAddingId(key);
      setError(null);
      try {
        const queued = await addFoodEntryRpc(
          userId,
          food.defaultGrams ?? 100,
          buildFoodEntryPayload(food, mealType, foodTrustMeta(food))
        );
        if (!queued) {
          cacheToLibrary(food, food.defaultGrams ?? 100);
          afterFoodLog();
        }
        flashSaved();
        onSaved?.();
        await lists.loadLists();
      } catch (err: unknown) {
        setError(toSaveErrorMessage(err));
      } finally {
        setQuickAddingId(null);
      }
    },
    [
      userId,
      quickAddingId,
      setQuickAddingId,
      mealType,
      onSaved,
      lists,
      flashSaved,
      cacheToLibrary,
      afterFoodLog,
      setError,
    ]
  );

  const quickAddFavorite = useCallback(
    async (fav: Favorite) => {
      if (!userId || quickAddingId) return;
      setQuickAddingId(fav.id);
      setError(null);
      try {
        const queued = await addFoodEntryRpc(
          userId,
          fav.default_grams,
          buildFoodEntryPayload(
            fav,
            mealType,
            foodTrustMeta({ ...fav, source: 'confirmed' })
          )
        );
        if (!queued) afterFoodLog();
        flashSaved();
        onSaved?.();
        await lists.loadLists();
      } catch (err: unknown) {
        setError(toSaveErrorMessage(err));
      } finally {
        setQuickAddingId(null);
      }
    },
    [
      userId,
      quickAddingId,
      setQuickAddingId,
      mealType,
      onSaved,
      lists,
      flashSaved,
      afterFoodLog,
      setError,
    ]
  );

  const quickRepeatEntry = useCallback(
    async (entry: RecentEntry) => {
      if (!userId || quickAddingId) return;
      setQuickAddingId(entry.id);
      setError(null);
      try {
        const grams = Math.max(1, parseGrams(entry.amount));
        const per100 = derivePer100(entry);
        const queued = await addFoodEntryRpc(
          userId,
          grams,
          buildFoodEntryPayload(
            {
              name: entry.name,
              brand: entry.brand,
              barcode: null,
              calories: Math.round(per100.calories),
              protein: Math.round(per100.protein * 10) / 10,
              carbs:
                per100.carbs != null ? Math.round(per100.carbs * 10) / 10 : null,
              fat: per100.fat != null ? Math.round(per100.fat * 10) / 10 : null,
              fiber: null,
              sugar: null,
            },
            mealType,
            foodTrustMeta({ ...entry, source: 'history' })
          )
        );
        if (!queued) afterFoodLog();
        flashSaved();
        onSaved?.();
        await lists.loadLists();
      } catch (err: unknown) {
        setError(toSaveErrorMessage(err));
      } finally {
        setQuickAddingId(null);
      }
    },
    [
      userId,
      quickAddingId,
      setQuickAddingId,
      mealType,
      onSaved,
      lists,
      flashSaved,
      afterFoodLog,
      setError,
    ]
  );

  return {
    save,
    quickAddSearchResult,
    quickAddFavorite,
    quickRepeatEntry,
  };
}
