import { supabase } from '../supabase';
import type { FoodBase } from './foodTypes';

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

  const { data: existing, error: findError } = await supabase
    .from('food_library')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .is('brand', null)
    .maybeSingle();
  if (findError) throw findError;

  const { data, error } = existing
    ? await supabase
      .from('food_library')
      .update(payload)
      .eq('id', existing.id)
      .select('name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,default_grams')
      .single()
    : await supabase
      .from('food_library')
      .insert(payload)
      .select('name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,default_grams')
      .single();
  if (error) throw error;

  return {
    name: data.name,
    brand: data.brand,
    barcode: data.barcode,
    calories: data.calories,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat,
    fiber: data.fiber,
    sugar: data.sugar,
    defaultGrams: data.default_grams,
    source: 'confirmed',
  };
}
