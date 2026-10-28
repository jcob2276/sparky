import { supabase } from '../supabase';
import { foodTrustMeta } from './foodTrust';
import type { FoodBase } from './foodTypes';
import { rankFoodResult } from './foodSearch';

export async function cacheFoodToLibrary(userId: string, food: FoodBase, defaultGrams: number): Promise<void> {
  const { error } = await supabase.rpc('ensure_food_library', {
    p_user_id: userId, p_default_grams: defaultGrams,
    p_food: {
      name: food.name, brand: food.brand, barcode: food.barcode,
      calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat,
      fiber: food.fiber, sugar: food.sugar, saturated_fat: food.saturated_fat ?? null,
      salt: food.salt ?? null, nutrient_sources: foodTrustMeta(food).micronutrientSources,
    },
  });
  if (error) throw error;
}

export interface CustomFoodInput {
  name: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  defaultGrams?: number;
}

export async function upsertCustomFood(userId: string, input: CustomFoodInput): Promise<FoodBase> {
  const name = input.name.trim();
  if (!name) throw new Error('Podaj nazwę produktu');
  if (input.calories < 0 || input.protein < 0) throw new Error('Makro nie może być ujemne');

  const payload = {
    user_id: userId,
    name,
    brand: null,
    barcode: null,
    calories: Math.round(input.calories),
    protein: Math.round(input.protein * 10) / 10,
    carbs: Math.round((input.carbs ?? 0) * 10) / 10,
    fat: Math.round((input.fat ?? 0) * 10) / 10,
    fiber: null,
    sugar: null,
    default_grams: Math.max(1, Math.round(input.defaultGrams ?? 100)),
    source: 'user_custom',
    validation_status: 'verified',
    validated_at: new Date().toISOString(),
    validation_reason: 'composer_manual',
  };

  const { data: libraryId, error: saveError } = await supabase.rpc('ensure_food_library', {
    p_user_id: userId, p_food: payload, p_default_grams: payload.default_grams,
  });
  if (saveError) throw saveError;
  const { data, error } = await supabase.from('food_library')
    .select('name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,nutrient_sources,default_grams')
    .eq('user_id', userId).eq('id', libraryId).single();
  if (error) throw error;

  return {
    library_id: libraryId,
    name: data.name,
    brand: data.brand,
    barcode: data.barcode,
    calories: data.calories,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat,
    fiber: data.fiber,
    sugar: data.sugar,
    saturated_fat: data.saturated_fat,
    salt: data.salt,
    nutrient_sources: data.nutrient_sources as FoodBase['nutrient_sources'],
    defaultGrams: data.default_grams,
    source: 'confirmed',
  };
}

export async function searchPrivateFoodLibrary(userId: string, query: string): Promise<FoodBase[]> {
  const readPage = (from: number) => supabase.from('food_library')
    .select('id,name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,nutrient_sources,default_grams')
    .eq('user_id', userId).neq('validation_status', 'quarantined').order('id').range(from, from + 499);
  const rows: NonNullable<Awaited<ReturnType<typeof readPage>>['data']> = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await readPage(from);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return rows.map(({ id, default_grams, nutrient_sources, ...food }) => ({
    ...food, library_id: id, defaultGrams: default_grams,
    nutrient_sources: nutrient_sources as FoodBase['nutrient_sources'], source: 'confirmed' as const,
  })).filter((food) => rankFoodResult(food, query) > 0)
    .sort((a, b) => rankFoodResult(b, query) - rankFoodResult(a, query)).slice(0, 12);
}
