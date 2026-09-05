import { supabase } from '../supabase';
import type { RepeatableFoodEntry } from './mealComposerUtils';

export interface ComposerTodayMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  entries: RepeatableFoodEntry[];
}

export interface TodayFoodEntry extends RepeatableFoodEntry {
  meal_type: string;
  date: string;
}

export async function fetchComposerTodayMeals(
  userId: string,
  date: string,
  mealType: string,
): Promise<ComposerTodayMeal[]> {
  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('id, name, brand, calories, protein, carbs, fat, fiber, sugar, amount, meal_group_id')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .order('logged_at', { ascending: true, nullsFirst: false });
  if (error) throw error;

  const groups = new Map<string, RepeatableFoodEntry[]>();
  for (const row of data ?? []) {
    const key = row.meal_group_id ?? row.id;
    const bucket = groups.get(key) ?? [];
    bucket.push(row as RepeatableFoodEntry);
    groups.set(key, bucket);
  }

  return [...groups.entries()].map(([id, entries]) => ({
    id,
    name: entries.map((entry) => entry.name).join(' + ').slice(0, 72),
    calories: Math.round(entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0)),
    protein: Math.round(entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0) * 10) / 10,
    entries,
  }));
}

export async function fetchAllTodayEntries(
  userId: string,
  date: string,
): Promise<TodayFoodEntry[]> {
  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('id, name, brand, calories, protein, carbs, fat, fiber, sugar, amount, meal_type')
    .eq('user_id', userId)
    .eq('date', date)
    .order('logged_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, date, meal_type: row.meal_type ?? 'snack' }) as TodayFoodEntry);
}
