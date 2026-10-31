import { supabase } from './supabase';
import { parseTodayLayout, type TodayLayout } from './todayLayout';

const KEY = 'ui:today_layout';

export async function fetchTodayLayout(userId: string): Promise<TodayLayout> {
  const { data, error } = await supabase.from('vanguard_preferences')
    .select('value').eq('user_id', userId).eq('key', KEY).maybeSingle();
  if (error) throw new Error(error.message);
  return parseTodayLayout(data?.value);
}

export async function saveTodayLayout(userId: string, value: unknown): Promise<TodayLayout> {
  const layout = parseTodayLayout(value);
  const { error } = await supabase.from('vanguard_preferences').upsert({
    user_id: userId,
    key: KEY,
    value: JSON.stringify(layout),
    // Technical UI configuration must not enter the active declarations read by Oracle.
    is_active: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,key' });
  if (error) throw new Error(error.message);
  return layout;
}
