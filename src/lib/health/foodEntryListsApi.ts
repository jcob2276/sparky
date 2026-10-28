import { supabase } from '../supabase';
import { getTodayWarsaw } from '../date';
import type { FoodBase } from './foodTypes';

export async function fetchFavorites(userId: string) {
  const { data, error } = await supabase.from('food_favorites')
    .select('id,library_id,use_count,last_used,is_pinned,default_grams,food_library!inner(name,brand,barcode,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,nutrient_sources)')
    .eq('user_id', userId).eq('food_library.user_id', userId)
    .neq('food_library.validation_status', 'quarantined')
    .order('use_count', { ascending: false }).order('last_used', { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []).map(({ food_library: food, ...usage }) => ({
    ...food, ...usage, library_id: usage.library_id ?? undefined,
    nutrient_sources: food.nutrient_sources as FoodBase['nutrient_sources'],
  }));
}

export async function fetchRecent(userId: string) {
  const { data, error } = await supabase.from('daily_food_entries')
    .select('id,name,brand,calories,protein,carbs,fat,amount,date,meal_group_id')
    .eq('user_id', userId).order('logged_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false }).limit(15);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTodayTotals(userId: string) {
  const { data, error } = await supabase.from('daily_nutrition').select('calories,protein')
    .eq('user_id', userId).eq('date', getTodayWarsaw()).maybeSingle();
  if (error) throw error;
  return { calories: data?.calories ?? 0, protein: data?.protein ?? 0 };
}
