import { useCallback, useMemo } from 'react';
import { buildQuickChips, type QuickChip } from '../../../../lib/health/mealComposerQuick';
import { QUICK_CAPTURE_FAVORITES } from '../../../../lib/health/foodLogging';
import type { TodayFoodEntry } from '../../../../lib/health/composerTodayMealsApi';
import type { recentProductToDraft } from '../../../../lib/health/recentFoodProductsApi';
import type { foodBaseToDraft } from '../../../../lib/health/mealComposerUtils';
import { favoriteToFoodBase } from './mealComposerCalc';

type RecentProduct = Parameters<typeof recentProductToDraft>[0];
type FoodBase = Parameters<typeof foodBaseToDraft>[0];

interface Params {
  allTodayEntries: TodayFoodEntry[] | undefined;
  recentProducts: RecentProduct[] | undefined;
  addFoodToDraft: (food: FoodBase, grams?: number) => void;
  addRecentProduct: (product: RecentProduct) => void;
  loadTodayMealToDraft: (mealId: string) => void;
}

export function useMealComposerQuickChips({
  allTodayEntries, recentProducts, addFoodToDraft, addRecentProduct, loadTodayMealToDraft,
}: Params) {
  const excludeNames = useMemo(() => {
    const set = new Set<string>();
    for (const entry of allTodayEntries ?? []) {
      set.add(entry.name);
    }
    return set;
  }, [allTodayEntries]);

  // Pasek szybkiego dodawania: tylko ulubione (ostatnie produkty tu nie wchodzą).
  const quickChips = useMemo(() => buildQuickChips({
    recentProducts: [],
    favorites: QUICK_CAPTURE_FAVORITES,
    excludeNames,
  }), [excludeNames]);

  const handleQuickChip = useCallback((chip: QuickChip) => {
    if (chip.kind === 'today') {
      loadTodayMealToDraft(chip.id.replace('today-', ''));
      return;
    }
    if (chip.kind === 'recent') {
      const product = recentProducts?.find((item) => chip.id === `recent-${item.id}`);
      if (product) addRecentProduct(product);
      return;
    }
    const fav = QUICK_CAPTURE_FAVORITES.find((item) => chip.id === `fav-${item.id}`);
    if (!fav) return;
    addFoodToDraft(favoriteToFoodBase(fav), fav.default_grams);
  }, [addFoodToDraft, addRecentProduct, loadTodayMealToDraft, recentProducts]);

  return { quickChips, handleQuickChip };
}
