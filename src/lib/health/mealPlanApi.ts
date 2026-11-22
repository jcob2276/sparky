import { supabase } from '../supabase';
import type { Json } from '../database.types';
import {fetchMealPreferences} from './mealPreferencesApi';
import {
  type MealPlanProduct,
  type MealPlanState,
  resizePlannedMeal,
  appendPlannedMeals,
  selectPlannedMeals,
  mealShoppingList,
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

async function fetchMealPlanState(userId: string, date: string): Promise<MealPlanState | null> {
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
/** An approved week remains visible on the following day; mutations keep its original storage row. */
export type MealPlannerSnapshot={storageDate:string;state:MealPlanState|null;coveringActive?:{storageDate:string;state:MealPlanState}};
export async function fetchMealPlannerState(userId:string,date:string):Promise<MealPlannerSnapshot> {
  const exact=await fetchMealPlanState(userId,date);
  if(exact?.active?.days.some(day=>day.date === date)) return {storageDate:date,state:exact};
  const {data,error}=await supabase.from('nutrition_targets').select('date,meal_plan').eq('user_id',userId)
    .contains('meal_plan',{active:{days:[{date}]}}).order('date',{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  const covering=data?.meal_plan as MealPlanState|null;
  if(exact) return {storageDate:date,state:exact,...(covering?{coveringActive:{storageDate:data!.date,state:covering}}:{})};
  return {storageDate:data?.date ?? date,state:covering ?? null};
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

export async function approveMealPlan(userId: string, date: string, approvalKey: string, baseRevision?:number,allergensReviewed=false,selection?:{date:string;mealKeys:string[]}): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (current?.approvalKey === approvalKey) return current;
  if (!current || !current.draft) throw new Error('Brak szkicu planu posiłków do zatwierdzenia.');
  if (baseRevision != null && current.revision !== baseRevision) throw new Error('Szkic zmienił się. Odśwież podgląd przed zatwierdzeniem.');
  if(current.draft.preferencesRevision != null) {
    const preferences=await fetchMealPreferences(userId);
    if(!preferences.confirmed || current.draft.preferencesRevision !== preferences.revision) throw new Error('Preferencje zmieniły się od utworzenia szkicu. Ułóż menu ponownie.');
    if(preferences.allergies.length && !allergensReviewed) throw new Error('Sprawdź skład i etykiety produktów pod kątem zgłoszonych alergii przed zatwierdzeniem.');
  }

  let active = current.draft;
  let checkedProducts = current.checkedProducts;
  if (selection) {
    const day = active.days.find(day => day.date === selection.date);
    if (!day) throw new Error('Dzień z wybranymi posiłkami nie występuje w szkicu.');
    const picked = selectPlannedMeals(day, selection.mealKeys);
    if (!picked.meals.length || picked.meals.length !== new Set(selection.mealKeys).size) {
      throw new Error('Zaznacz co najmniej jeden posiłek z aktualnego szkicu.');
    }
    const existingDay = current.active?.days.find(row => row.date === selection.date);
    const merged = existingDay ? appendPlannedMeals(existingDay, picked.meals) : picked;
    const otherDays = current.active?.days.filter(row => row.date !== selection.date) ?? [];
    active = { ...active, days: [...otherDays, merged].sort((a,b) => a.date.localeCompare(b.date)) };
    const previousItems = new Map((current.active ? mealShoppingList(current.active) : []).map(item => [item.productId,item.grams]));
    const retained = new Set(mealShoppingList(active).filter(item => item.grams === previousItems.get(item.productId)).map(item => item.productId));
    checkedProducts = checkedProducts?.filter(id => retained.has(id));
  }

  const updated: MealPlanState = {
    ...current,
    revision: (current.revision || 0) + 1,
    active,
    ...(selection ? {checkedProducts: checkedProducts ?? []} : {}),
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
  ,baseRevision?:number,mealDate=date
): Promise<MealPlanState> {
  const current = await fetchMealPlanState(userId, date);
  if (!current) throw new Error('Brak planu posiłków do przeskalowania.');
  if (baseRevision != null && current.revision !== baseRevision) throw new Error('Plan posiłków zmienił się. Odśwież podgląd porcji.');

  const targetPlan = current.draft ?? current.active;
  if (!targetPlan) throw new Error('Brak posiłków do zmiany wielkości.');

  const resized = resizePlannedMeal(targetPlan, mealDate, mealKey, factor);
  const updated: MealPlanState = {
    ...current,
    revision: (current.revision || 0) + 1,
    draft: current.draft ? resizePlannedMeal(current.draft, mealDate, mealKey, factor) : null,
    active: current.draft ? current.active : resized,
  };

  await saveMealPlanState(userId, date, updated,current.revision);
  return updated;
}
