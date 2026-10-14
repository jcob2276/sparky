import { supabase } from '../supabase';
import {
  type MealPlanProduct,
  type MealPlanState,
  buildMealPlan,
  mealShoppingList,
  resizePlannedMeal,
} from '@vanguard/domain';

export async function fetchMealPlanProducts(userId: string): Promise<MealPlanProduct[]> {
  const [refRes, libRes] = await Promise.all([
    supabase.from('food_reference_pl').select('id, name, calories, protein, carbs, fat, fiber').limit(150),
    supabase.from('food_library').select('id, name, calories, protein, carbs, fat, fiber, brand, barcode, source').eq('user_id', userId).limit(150),
  ]);

  const products: MealPlanProduct[] = [];
  const seen = new Set<string>();

  for (const row of refRes.data ?? []) {
    const name = row.name.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    products.push({
      id: row.id,
      name,
      source: 'curated_pl',
      verified: true,
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carbs: Number(row.carbs) || 0,
      fat: Number(row.fat) || 0,
      fiber: row.fiber != null ? Number(row.fiber) : null,
    });
  }

  for (const row of libRes.data ?? []) {
    const name = row.name.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    products.push({
      id: row.id,
      name,
      source: row.source || 'user_custom',
      verified: Boolean(row.brand || row.barcode),
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carbs: Number(row.carbs) || 0,
      fat: Number(row.fat) || 0,
      fiber: row.fiber != null ? Number(row.fiber) : null,
    });
  }

  return products;
}

export async function fetchMealPlanState(userId: string, date: string): Promise<MealPlanState | null> {
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('meal_plan')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error || !data?.meal_plan || typeof data.meal_plan !== 'object') return null;
  const rawPlan: unknown = data.meal_plan;
  return rawPlan as MealPlanState;
}

async function saveMealPlanState(userId: string, date: string, state: MealPlanState): Promise<void> {
  const payload: Record<string, unknown> = state;
  const { error } = await supabase
    .from('nutrition_targets')
    .update({ meal_plan: payload })
    .eq('user_id', userId)
    .eq('date', date);

  if (error) throw new Error(`Błąd zapisu planu posiłków: ${error.message}`);
}

export async function approveMealPlan(userId: string, date: string, approvalKey?: string): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (!current || !current.draft) throw new Error('Brak szkicu planu posiłków do zatwierdzenia.');

  const updated: MealPlanState = {
    ...current,
    revision: (current.revision || 0) + 1,
    active: current.draft,
    approvalKey: approvalKey || `appr_${Date.now()}`,
  };

  await saveMealPlanState(userId, date, updated);
  return updated;
}

export async function toggleShoppingItem(userId: string, date: string, productId: string): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (!current) throw new Error('Brak aktywnego planu posiłków.');

  const set = new Set(current.checkedProducts ?? []);
  if (set.has(productId)) {
    set.delete(productId);
  } else {
    set.add(productId);
  }

  const updated: MealPlanState = {
    ...current,
    checkedProducts: Array.from(set),
  };

  await saveMealPlanState(userId, date, updated);
  return updated;
}

export async function resizeMealInPlanState(
  userId: string,
  date: string,
  mealKey: string,
  factor: number
): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (!current) throw new Error('Brak planu posiłków do przeskalowania.');

  const targetPlan = current.active ?? current.draft;
  if (!targetPlan) throw new Error('Brak posiłków do zmiany wielkości.');

  const resized = resizePlannedMeal(targetPlan, date, mealKey, factor);
  const updated: MealPlanState = {
    ...current,
    revision: (current.revision || 0) + 1,
    draft: current.draft ? resizePlannedMeal(current.draft, date, mealKey, factor) : null,
    active: current.active ? resized : null,
  };

  await saveMealPlanState(userId, date, updated);
  return updated;
}
