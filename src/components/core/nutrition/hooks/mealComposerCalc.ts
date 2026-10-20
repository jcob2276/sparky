import type { fetchNutritionDayContext } from '../../../../lib/health/nutritionContext';
import type { TodayFoodEntry } from '../../../../lib/health/composerTodayMealsApi';
import { mealLabelForType } from '../../../../lib/health/mealComposerUtils';
import type { QUICK_CAPTURE_FAVORITES } from '../../../../lib/health/foodLogging';

type NutritionDayContext = Awaited<ReturnType<typeof fetchNutritionDayContext>>;
type QuickFavorite = (typeof QUICK_CAPTURE_FAVORITES)[number];

export function computeComposerTotals(ctx: NutritionDayContext | undefined, entries: TodayFoodEntry[] | undefined) {
  // Live entries from daily_food_entries are the single source of truth for logged values
  const liveCalories = entries
    ? Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0))
    : (ctx?.calories ?? 0);
  const liveProtein = entries
    ? Math.round(entries.reduce((s, e) => s + (e.protein ?? 0), 0) * 10) / 10
    : (ctx?.protein ?? 0);

  return {
    calories: liveCalories,
    protein: liveProtein,
    targetKcal: ctx?.targetKcal ?? null,
    targetProtein: ctx?.targetProtein ?? null,
    avgFoodQuality: ctx?.avgFoodQuality ?? null,
    foodQualityAnalysis: ctx?.foodQualityAnalysis ?? null,
  };
}

export function buildYesterdayMealSuggestion(
  yesterdayEntries: TodayFoodEntry[],
  todayEntries: TodayFoodEntry[],
  mealType: string,
) {
  const todayHasMeal = todayEntries.some((e) => e.meal_type === mealType);
  if (todayHasMeal) return null;

  const yesterdayMealEntries = yesterdayEntries.filter((e) => e.meal_type === mealType);
  if (!yesterdayMealEntries.length) return null;

  const totalCalories = Math.round(yesterdayMealEntries.reduce((sum, e) => sum + (e.calories ?? 0), 0));
  const totalProtein = Math.round(yesterdayMealEntries.reduce((sum, e) => sum + (e.protein ?? 0), 0) * 10) / 10;
  const name = yesterdayMealEntries.map((e) => e.name).join(' + ').slice(0, 42);

  return {
    name,
    calories: totalCalories,
    protein: totalProtein,
    mealLabel: mealLabelForType(mealType),
    entries: yesterdayMealEntries,
  };
}

export function favoriteToFoodBase(fav: QuickFavorite) {
  return {
    name: fav.name,
    brand: fav.brand,
    barcode: null,
    calories: fav.calories,
    protein: fav.protein,
    carbs: fav.carbs,
    fat: fav.fat,
    fiber: fav.fiber,
    sugar: fav.sugar,
    defaultGrams: fav.default_grams,
    source: 'confirmed' as const,
  };
}
