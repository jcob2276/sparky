/** Persistent owner-authored core memory slots in vanguard_preferences. */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { readMemoryValue } from '@vanguard/domain';

export interface CoreMemoryBlocks {
  human?: string;
  focus?: string;
  avoidance?: string;
}
export interface CoreMemoryMutation {
  block: 'human' | 'focus' | 'avoidance';
  action: 'set' | 'append';
  content: string;
}
const PREFIX = 'core_memory:';
const MAX_BLOCK_CHARS = 220;
const BLOCKS = ['human', 'focus', 'avoidance'] as const;

export async function fetchCoreMemory(supabase: SupabaseClient, userId: string): Promise<CoreMemoryBlocks> {
  const { data, error } = await supabase.from('vanguard_preferences').select('key, value')
    .eq('user_id', userId).eq('is_active', true).like('key', `${PREFIX}%`);
  if (error) throw new Error('Core memory could not be read');
  const result: CoreMemoryBlocks = {};
  for (const row of data ?? []) {
    const parsed = readMemoryValue(row.value);
    if (!parsed.restorable) continue;
    const block = BLOCKS.find((name) => row.key === `${PREFIX}${name}`);
    if (block) result[block] = parsed.text.slice(0, MAX_BLOCK_CHARS);
  }
  return result;
}

export async function applyCoreMemoryMutation(
  supabase: SupabaseClient, userId: string, mutation: CoreMemoryMutation,
): Promise<boolean> {
  if (!mutation || !BLOCKS.includes(mutation.block)
    || !['set', 'append'].includes(mutation.action) || typeof mutation.content !== 'string') return false;
  const addition = mutation.content.replace(/[\r\n]+/g, ' ').trim();
  if (!addition) return false;
  const key = `${PREFIX}${mutation.block}`;
  let text = addition;
  let current: { id: string; value: string } | null = null;
  if (mutation.action === 'append') {
    const { data, error } = await supabase.from('vanguard_preferences').select('id, value')
      .eq('user_id', userId).eq('key', key).eq('is_active', true).maybeSingle();
    if (error) return false;
    current = data;
    const parsed = readMemoryValue(current?.value ?? null);
    if (parsed.restorable) text = `${parsed.text.trim()} ${addition}`;
    // Refuse an append that would silently discard either old or added content.
    if (text.length > MAX_BLOCK_CHARS) return false;
  }
  text = text.slice(0, MAX_BLOCK_CHARS);
  const now = new Date();
  const ttlDays = mutation.block === 'human' ? 60 : 7;
  const payload = {
    user_id: userId, key, is_active: true, updated_at: now.toISOString(),
    value: JSON.stringify({ text, updated_at: now.toISOString(), expires_at: new Date(now.getTime() + ttlDays * 86400000).toISOString() }),
  };
  const query = current
    ? supabase.from('vanguard_preferences').update(payload)
      .eq('id', current.id).eq('user_id', userId).eq('is_active', true).eq('value', current.value)
    : mutation.action === 'append'
      ? supabase.from('vanguard_preferences').insert(payload)
      : supabase.from('vanguard_preferences').upsert(payload, { onConflict: 'user_id,key' });
  const { data, error } = await query.select('id').maybeSingle();
  // No text, JSON envelope or database error payload is written to logs.
  return !error && typeof data?.id === 'string';
}

/** Apply the write before the answer is rendered or stored in the Oracle run. */
export async function persistCoreMemoryResponse<T extends Record<string, unknown>>(
  supabase: SupabaseClient, userId: string, response: T, runMode: string,
): Promise<T & { core_memory_saved?: boolean; text?: string }> {
  if (!response.core_memory_mutation) return response;
  const saved = runMode !== 'readOnly' && await applyCoreMemoryMutation(
    supabase, userId, response.core_memory_mutation as CoreMemoryMutation,
  ).catch(() => false);
  if (saved) return { ...response, core_memory_saved: true };
  const failureText = runMode === 'readOnly'
    ? 'Tryb tylko do odczytu: nie zapisano zmiany w pamięci Sparky.'
    : 'Nie udało się potwierdzić zapisu zmiany w pamięci Sparky. Sprawdź wpis przed ponowną próbą.';
  return {
    ...response, answer: failureText, text: failureText, should_respond: true,
    core_memory_mutation: undefined, core_memory_saved: false,
  };
}
