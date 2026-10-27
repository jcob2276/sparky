import { supabase } from '../supabase';
import { shiftDateStr } from '../date';
import type { NutritionDayRow } from '../weeklyNutritionPulse';

interface WeekEntryNutrients {
  date: string;
  fiber: number | null;
  saturated_fat: number | null;
  salt?: number | null;
}

export interface WeekNutritionInputs {
  rows: NutritionDayRow[];
  entries: WeekEntryNutrients[];
  targetByDate: Record<string, number>;
}

/** Dane żywienia z tygodnia pon–nd: sumy dni, pozycje (do pokrycia błonnika i nasyconych) i dzienne cele kcal. */
export async function fetchWeekNutritionInputs(userId: string, weekStart: string): Promise<WeekNutritionInputs> {
  const weekEnd = shiftDateStr(weekStart, 6);
  const [rowsRes, entriesRes, targetsRes] = await Promise.all([
    supabase.from('daily_nutrition')
      .select('date, calories, protein, carbs, fat, fiber, sugar, avg_food_quality, insulin_load')
      .eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd).order('date', { ascending: true }),
    supabase.from('daily_food_entries')
      .select('date, fiber, saturated_fat, salt')
      .eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('nutrition_targets')
      .select('date, target_kcal')
      .eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd).not('target_kcal', 'is', null),
  ]);
  if (rowsRes.error) throw rowsRes.error;
  if (entriesRes.error) throw entriesRes.error;
  if (targetsRes.error) throw targetsRes.error;
  const targetByDate: Record<string, number> = {};
  for (const row of targetsRes.data ?? []) if (row.target_kcal != null) targetByDate[row.date] = Number(row.target_kcal);
  return {
    rows: (rowsRes.data ?? []).map((row) => ({
      date: row.date,
      calories: row.calories,
      protein: row.protein == null ? null : Number(row.protein),
      carbs: row.carbs == null ? null : Number(row.carbs),
      fat: row.fat == null ? null : Number(row.fat),
      fiber: row.fiber == null ? null : Number(row.fiber),
      sugar: row.sugar == null ? null : Number(row.sugar),
      avg_food_quality: row.avg_food_quality == null ? null : Number(row.avg_food_quality),
      insulin_load: row.insulin_load == null ? null : Number(row.insulin_load),
    })),
    entries: (entriesRes.data ?? []).map((row) => ({
      date: row.date,
      fiber: row.fiber == null ? null : Number(row.fiber),
      saturated_fat: row.saturated_fat == null ? null : Number(row.saturated_fat),
      salt: row.salt == null ? null : Number(row.salt),
    })),
    targetByDate,
  };
}
