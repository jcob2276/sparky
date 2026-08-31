import type { MealDraftItem } from './nutritionTracker';
import type { ParsedFoodItem } from './foodLogging';
import type { FoodBase } from './foodTypes';

function scalePer100(value: number | null, grams: number): number {
  if (value == null) return 0;
  return Math.round((value * grams) / 100 * 10) / 10;
}

export function parsedToDraft(items: ParsedFoodItem[]): MealDraftItem[] {
  return items.map((item, index) => ({
    ...item,
    id: `draft-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
  }));
}

export function foodBaseToDraft(food: FoodBase, grams: number): MealDraftItem {
  const g = Math.max(1, Math.round(grams));
  const defaultGrams = food.defaultGrams != null && food.defaultGrams > 0
    ? Math.round(food.defaultGrams)
    : undefined;
  return {
    id: crypto.randomUUID(),
    name: food.name,
    grams: g,
    calories: Math.round(scalePer100(food.calories, g)),
    protein: scalePer100(food.protein, g),
    carbs: scalePer100(food.carbs, g),
    fat: scalePer100(food.fat, g),
    fiber: food.fiber == null ? undefined : scalePer100(food.fiber, g),
    sugar: food.sugar == null ? undefined : scalePer100(food.sugar, g),
    confidence: food.confidence ?? 'high',
    source: food.source === 'confirmed' ? 'library' : 'database',
    parseMeta: {
      macroSource: food.source === 'confirmed' ? 'user_correction' : 'off',
      parserVersion: 'composer-search-v1',
      explicitGrams: true,
      unit: 'g',
      quantity: g,
      defaultGrams,
    },
  };
}

export interface RepeatableFoodEntry {
  id: string;
  name: string;
  brand: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  amount: string | null;
}

export function parseAmountGrams(amount: string | null): number {
  if (!amount) return 100;
  const match = amount.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 100;
  return Math.max(1, Math.round(parseFloat(match[1].replace(',', '.'))));
}

export function entriesToDraft(entries: RepeatableFoodEntry[]): MealDraftItem[] {
  return entries.map((entry, index) => {
    const grams = parseAmountGrams(entry.amount);
    return {
      id: `repeat-${index + 1}`,
      name: entry.name,
      grams,
      calories: entry.calories ?? 0,
      protein: entry.protein ?? 0,
      carbs: entry.carbs ?? 0,
      fat: entry.fat ?? 0,
      fiber: entry.fiber ?? undefined,
      sugar: entry.sugar ?? undefined,
      confidence: 'high' as const,
      source: 'library' as const,
    };
  });
}

export function mealLabelForType(mealType: string): string {
  if (mealType === 'breakfast') return 'śniadanie';
  if (mealType === 'lunch') return 'obiad';
  if (mealType === 'dinner') return 'kolację';
  return 'przekąskę';
}
