import type {SupabaseClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {MEAL_PREFERENCES_KEY,parseMealPreferences} from '@vanguard/domain';
export async function fetchMealPreferences(db:SupabaseClient,userId:string) {
  const {data,error}=await db.from('vanguard_preferences').select('value').eq('user_id',userId).eq('key',MEAL_PREFERENCES_KEY).eq('is_active',true).maybeSingle();
  if(error) throw error;
  return parseMealPreferences(data?.value ?? null);
}
