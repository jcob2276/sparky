import { supabase, invokeEdge } from './supabase';
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

export async function ingestVaultCategory(
  userId: string,
  category: string,
  text: string
): Promise<{ chunks?: number }> {
  const data = await invokeEdge('vanguard-capture', {
    body: { userId, category, text },
  });
  const res = data as { error?: string; chunks?: number } | undefined;
  if (res?.error) throw new Error(res.error);
  return {
    chunks: typeof res?.chunks === 'number' ? res.chunks : 0,
  };
}
