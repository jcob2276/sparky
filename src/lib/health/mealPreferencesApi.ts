import {supabase} from '../supabase';
import {MEAL_PREFERENCES_KEY,parseMealPreferences,type MealPreferences} from '@vanguard/domain';
export async function fetchMealPreferences(userId:string):Promise<MealPreferences> {
  const {data,error}=await supabase.from('vanguard_preferences').select('value,is_active').eq('user_id',userId).eq('key',MEAL_PREFERENCES_KEY).maybeSingle();
  if(error) throw error;
  const preferences=parseMealPreferences(data?.value ?? null);
  return data?.is_active === false?{...preferences,confirmed:false}:preferences;
}
export async function saveMealPreferences(userId:string,input:MealPreferences):Promise<MealPreferences> {
  const value=parseMealPreferences(input);
  if(!value.confirmed) throw new Error('Potwierdź preferencje i zgłoszone alergie, również jeśli ich nie zgłaszasz.');
  const {data:prior,error:readError}=await supabase.from('vanguard_preferences').select('value').eq('user_id',userId).eq('key',MEAL_PREFERENCES_KEY).maybeSingle();
  if(readError) throw readError;
  if(parseMealPreferences(prior?.value ?? null).revision !== value.revision) throw new Error('Preferencje zmieniły się w innej sesji. Odśwież formularz.');
  const next={...value,revision:value.revision+1},payload={user_id:userId,key:MEAL_PREFERENCES_KEY,value:JSON.stringify(next),is_active:true,updated_at:new Date().toISOString()};
  const query=prior?supabase.from('vanguard_preferences').update(payload).eq('user_id',userId).eq('key',MEAL_PREFERENCES_KEY).eq('value',prior.value)
    :supabase.from('vanguard_preferences').upsert(payload,{onConflict:'user_id,key',ignoreDuplicates:true});
  const {data,error}=await query.select('value').maybeSingle();
  if(error) throw error;
  if(!data) throw new Error('Preferencje zmieniły się podczas zapisu. Odśwież formularz.');
  return parseMealPreferences(data.value);
}
