import { supabase, invokeEdge } from './supabase';
import type { Tables, Json } from './database.types';

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

export type SparkyIdentityRow = Tables<'vanguard_identity'>;
export type VanguardIdentityRow = SparkyIdentityRow;

export async function fetchSparkyIdentity(userId: string): Promise<SparkyIdentityRow | null> {
  const { data, error } = await supabase
    .from('vanguard_identity')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export const fetchVanguardIdentity = fetchSparkyIdentity;

export async function upsertSparkyIdentity(userId: string, payload: {
  long_term_mission: string;
  pillars: string[];
  avoidance_triggers: string;
  behavioral_baseline?: unknown;
}): Promise<void> {
  const { error } = await supabase.from('vanguard_identity').upsert({
    user_id: userId,
    long_term_mission: payload.long_term_mission,
    pillars: payload.pillars,
    avoidance_triggers: payload.avoidance_triggers,
    behavioral_baseline: (payload.behavioral_baseline ?? null) as Json,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
export const upsertVanguardIdentity = upsertSparkyIdentity;

export async function ingestVaultCategory(
  userId: string,
  category: string,
  text: string
): Promise<{ chunks?: number; triads?: number }> {
  const data = await invokeEdge('vanguard-capture', {
    body: { userId, category, text },
  });
  const res = data as { error?: string; chunks?: number; triads?: number } | undefined;
  if (res?.error) throw new Error(res.error);
  return {
    chunks: typeof res?.chunks === 'number' ? res.chunks : 0,
    triads: typeof res?.triads === 'number' ? res.triads : 0,
  };
}

export async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}
