import { supabase } from '../supabase';
import { shiftDateStr } from '../date';
import { fetchNutritionDayReviews } from './nutritionTrackerApi';
import type { NutritionDayCompleteness } from './nutritionTracker';

export interface WeekBalanceRows {
  eatenByDate: Record<string, number>;
  targetByDate: Record<string, number>;
  completenessByDate: Record<string, NutritionDayCompleteness>;
}

/** Zjedzone kcal i dzienne cele kcal z tygodnia zaczynającego się w `weekStart` (poniedziałek). */
export async function fetchWeekBalanceRows(userId: string, weekStart: string): Promise<WeekBalanceRows> {
  const weekEnd = shiftDateStr(weekStart, 6);
  const [eatenRes, targetRes, reviews] = await Promise.all([
    supabase.from('daily_nutrition').select('date, calories').eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('nutrition_targets').select('date, target_kcal').eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd).not('target_kcal', 'is', null),
    fetchNutritionDayReviews(userId, weekStart),
  ]);
  if (eatenRes.error) throw eatenRes.error;
  if (targetRes.error) throw targetRes.error;
  const eatenByDate: Record<string, number> = {};
  for (const row of eatenRes.data ?? []) eatenByDate[row.date] = Number(row.calories ?? 0);
  const targetByDate: Record<string, number> = {};
  for (const row of targetRes.data ?? []) if (row.target_kcal != null) targetByDate[row.date] = Number(row.target_kcal);
  const completenessByDate: Record<string, NutritionDayCompleteness> = {};
  for (const review of reviews) if (review.date <= weekEnd) completenessByDate[review.date] = review.completeness;
  return { eatenByDate, targetByDate, completenessByDate };
}
