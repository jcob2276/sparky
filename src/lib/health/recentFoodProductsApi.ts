import { getTodayWarsaw } from '../date';
import { supabase } from '../supabase';
import type { MealDraftItem } from './nutritionTracker';
import { parseAmountGrams } from './mealComposerUtils';

export interface RecentFoodProduct {
  id: string;
  name: string;
  brand: string | null;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  loggedAt: string | null;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('pl');
}

export async function fetchRecentFoodProducts(userId: string, limit = 8): Promise<RecentFoodProduct[]> {
  const today = getTodayWarsaw();
  const since = new Date(`${today}T12:00:00`);
  since.setDate(since.getDate() - 14);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('id, name, brand, calories, protein, carbs, fat, fiber, sugar, amount, logged_at')
    .eq('user_id', userId)
    .gte('date', sinceDate)
    .order('logged_at', { ascending: false, nullsFirst: false })
    .limit(60);
  if (error) throw error;

  const seen = new Set<string>();
  const products: RecentFoodProduct[] = [];
  for (const row of data ?? []) {
    const key = normalizeName(row.name);
    if (seen.has(key)) continue;
    seen.add(key);
    const grams = parseAmountGrams(row.amount);
    products.push({
      id: row.id,
      name: row.name,
      brand: row.brand,
      grams,
      calories: row.calories ?? 0,
      protein: row.protein ?? 0,
      carbs: row.carbs ?? 0,
      fat: row.fat ?? 0,
      fiber: row.fiber,
      sugar: row.sugar,
      loggedAt: row.logged_at,
    });
    if (products.length >= limit) break;
  }
  return products;
}

export function recentProductToDraft(product: RecentFoodProduct): MealDraftItem {
  return {
    id: `recent-${product.id}`,
    name: product.name,
    grams: product.grams,
    calories: product.calories,
    protein: product.protein,
    carbs: product.carbs,
    fat: product.fat,
    fiber: product.fiber ?? undefined,
    sugar: product.sugar ?? undefined,
    confidence: 'high',
    source: 'library',
    parseMeta: {
      macroSource: 'user_correction',
      parserVersion: 'composer-recent-v1',
      explicitGrams: true,
      unit: 'g',
      quantity: product.grams,
      defaultGrams: product.grams,
    },
  };
}
