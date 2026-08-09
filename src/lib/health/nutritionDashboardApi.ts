import { supabase } from '../supabase';
import { fetchNutritionDayReviews } from './nutritionTrackerApi';

export async function fetchNutritionDashboardData(input: {
  userId: string;
  today: string;
  since: string;
  calibrationSince: string;
}) {
  const { userId, today, since, calibrationSince } = input;
  const [targetRes, nutritionRes, entriesRes, calibrationRes, weightsRes, dayReviews] = await Promise.all([
    supabase
      .from('nutrition_targets')
      .select('target_kcal, protein_floor_g, verdict, forecast_30d_weight_kg, forecast_60d_weight_kg, forecast_90d_weight_kg, forecast_30d_bf_pct, forecast_60d_bf_pct, forecast_90d_bf_pct, days_to_goal_est, adaptive_correction_kcal')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('daily_nutrition')
      .select('date, protein, calories, carbs, fat, fiber, sugar, food_quality_analysis, insulin_load, avg_food_quality')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase
      .from('daily_food_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('logged_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase.from('daily_nutrition').select('date,calories').eq('user_id', userId)
      .gte('date', calibrationSince).order('date', { ascending: true }),
    supabase.from('body_metrics').select('date,weight').eq('user_id', userId)
      .gte('date', calibrationSince).not('weight', 'is', null).order('date', { ascending: true }),
    fetchNutritionDayReviews(userId, calibrationSince),
  ]);
  return { targetRes, nutritionRes, entriesRes, calibrationRes, weightsRes, dayReviews };
}

export async function removeNutritionEntry(userId: string, entryId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_food_entry', {
    p_user_id: userId,
    p_entry_id: entryId,
  });
  if (error) throw error;
}
