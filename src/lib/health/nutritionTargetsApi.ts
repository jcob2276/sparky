import { supabase } from '../supabase';
import { getTodayWarsaw } from '../date';

/**
 * Cel żywieniowy obowiązujący w danym dniu: wiersz z tą datą albo ostatni wcześniejszy. Trener zapisuje cel na jutro
 * z wyprzedzeniem, więc „najnowszy wiersz” bez ograniczenia daty to często cel na jutro, a nie na dziś.
 */
export async function fetchNutritionTargetForDay(userId: string, date: string = getTodayWarsaw()) {
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('date, target_kcal, protein_floor_g')
    .eq('user_id', userId)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
