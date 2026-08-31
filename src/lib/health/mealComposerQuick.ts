import type { FoodFavoriteRow } from './foodLogging';
import type { RecentFoodProduct } from './recentFoodProductsApi';
import type { ComposerTodayMeal } from './composerTodayMealsApi';

type QuickChipKind = 'today' | 'recent' | 'favorite';

export interface QuickChip {
  id: string;
  kind: QuickChipKind;
  name: string;
  detail: string;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('pl');
}

export function buildQuickChips(input: {
  todayMeals: ComposerTodayMeal[];
  recentProducts: RecentFoodProduct[];
  favorites: ReadonlyArray<Omit<FoodFavoriteRow, 'barcode'> & { barcode?: string | null }>;
  max?: number;
}): QuickChip[] {
  const seen = new Set<string>();
  const chips: QuickChip[] = [];
  const max = input.max ?? 10;

  for (const meal of input.todayMeals) {
    const key = normalizeName(meal.name);
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push({
      id: `today-${meal.id}`,
      kind: 'today',
      name: meal.name,
      detail: `${meal.calories} kcal · dziś`,
    });
    if (chips.length >= max) return chips;
  }

  for (const product of input.recentProducts) {
    const key = normalizeName(product.name);
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push({
      id: `recent-${product.id}`,
      kind: 'recent',
      name: product.name,
      detail: `${product.grams}g · ${product.calories} kcal`,
    });
    if (chips.length >= max) return chips;
  }

  for (const fav of input.favorites) {
    const key = normalizeName(fav.name);
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push({
      id: `fav-${fav.id}`,
      kind: 'favorite',
      name: fav.name,
      detail: 'ulubione',
    });
    if (chips.length >= max) return chips;
  }

  return chips;
}
