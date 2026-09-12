import { supabase } from './supabase';
import type { Tables } from './database.types';

export type UserFundamentRow = Tables<'user_fundament'>;

export async function fetchUserFundament(userId: string): Promise<UserFundamentRow | null> {
  const { data } = await supabase
    .from('user_fundament')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function upsertUserFundament(userId: string, patch: Record<string, string>): Promise<void> {
  const { error } = await supabase
    .from('user_fundament')
    .upsert({
      user_id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw error;
}

export type VanguardIdentityRow = Tables<'vanguard_identity'>;

export async function fetchVanguardIdentity(userId: string): Promise<VanguardIdentityRow | null> {
  const { data, error } = await supabase
    .from('vanguard_identity')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertVanguardIdentity(userId: string, payload: {
  long_term_mission: string;
  pillars: string[];
  avoidance_triggers: string;
  behavioral_baseline: unknown;
}): Promise<void> {
  const { error } = await supabase.from('vanguard_identity').upsert({
    user_id: userId,
    long_term_mission: payload.long_term_mission,
    pillars: payload.pillars,
    avoidance_triggers: payload.avoidance_triggers,
    behavioral_baseline: payload.behavioral_baseline,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
