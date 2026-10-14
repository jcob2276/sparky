import { supabase } from '../supabase';
import type { Json } from '../database.types';
import {
  type MealPlanProduct,
  type MealPlanState,
  resizePlannedMeal,
  readMealCatalog,
} from '@vanguard/domain';

export async function fetchMealPlanProducts(userId: string): Promise<MealPlanProduct[]> {
  const [refRes, libRes] = await Promise.all([
    supabase.from('food_reference_pl').select('id, name, calories, protein, carbs, fat, fiber').limit(150),
    supabase.from('food_library').select('id, name, calories, protein, carbs, fat, fiber, source, validation_status').eq('user_id', userId).limit(150),
  ]);

  for (const result of [refRes,libRes]) if (result.error) throw result.error;
  return readMealCatalog(refRes.data ?? [],libRes.data ?? []);
}

export async function fetchMealPlanState(userId: string, date: string): Promise<MealPlanState | null> {
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('meal_plan')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  if (!data?.meal_plan || typeof data.meal_plan !== 'object' || Array.isArray(data.meal_plan)) return null;
  const rawPlan: unknown = data.meal_plan;
  return rawPlan as MealPlanState;
}

async function saveMealPlanState(userId: string, date: string, state: MealPlanState, baseRevision:number): Promise<void> {
  const payload: Json = JSON.parse(JSON.stringify(state));
  const { data,error } = await supabase
    .from('nutrition_targets')
    .update({ meal_plan: payload })
    .eq('user_id', userId)
    .eq('date', date)
    .contains('meal_plan',{revision:baseRevision})
    .select('meal_plan')
    .maybeSingle();

  if (error) throw new Error(`Błąd zapisu planu posiłków: ${error.message}`);
  if (!data) throw new Error('Plan posiłków zmienił się w innej sesji. Odśwież podgląd przed ponowieniem.');
}

export async function approveMealPlan(userId: string, date: string, approvalKey: string, baseRevision?:number): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (current?.approvalKey === approvalKey) return current;
  if (!current || !current.draft) throw new Error('Brak szkicu planu posiłków do zatwierdzenia.');
  if (baseRevision != null && current.revision !== baseRevision) throw new Error('Szkic zmienił się. Odśwież podgląd przed zatwierdzeniem.');

  const updated: MealPlanState = {
    ...current,
    revision: (current.revision || 0) + 1,
    active: current.draft,
    draft:null,
    approvalKey,
  };

  await saveMealPlanState(userId, date, updated,current.revision);
  return updated;
}

export async function toggleShoppingItem(userId: string, date: string, productId: string,baseRevision?:number,checked?:boolean): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (!current) throw new Error('Brak aktywnego planu posiłków.');

  const set = new Set(current.checkedProducts ?? []);
  if (checked != null && set.has(productId) === checked) return current;
  if (baseRevision != null && current.revision !== baseRevision) throw new Error('Plan posiłków zmienił się. Odśwież listę zakupów.');
  if (checked === false || (checked == null && set.has(productId))) {
    set.delete(productId);
  } else {
    set.add(productId);
  }

  const updated: MealPlanState = {
    ...current,
    revision:current.revision+1,
    checkedProducts: Array.from(set),
  };

  await saveMealPlanState(userId, date, updated,current.revision);
  return updated;
}

export async function resizeMealInPlanState(
  userId: string,
  date: string,
  mealKey: string,
  factor: number
  ,baseRevision?:number
): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (!current) throw new Error('Brak planu posiłków do przeskalowania.');
  if (baseRevision != null && current.revision !== baseRevision) throw new Error('Plan posiłków zmienił się. Odśwież podgląd porcji.');

  const targetPlan = current.draft ?? current.active;
  if (!targetPlan) throw new Error('Brak posiłków do zmiany wielkości.');

  const resized = resizePlannedMeal(targetPlan, date, mealKey, factor);
  const updated: MealPlanState = {
    ...current,
    revision: (current.revision || 0) + 1,
    draft: current.draft ? resizePlannedMeal(current.draft, date, mealKey, factor) : null,
    active: current.draft ? current.active : resized,
  };

  await saveMealPlanState(userId, date, updated,current.revision);
  return updated;
}
