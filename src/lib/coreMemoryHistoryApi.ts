import { supabase } from './supabase';
import { MEMORY_BLOCK_LABELS } from './coreMemoryHistory';

interface MemoryPreference {
  id: string;
  key: string;
  value: string;
  is_active: boolean;
  updated_at: string;
}
export interface MemoryRevision {
  id: string;
  preference_id: string;
  key: string;
  operation: 'insert' | 'update' | 'delete';
  old_value: string | null;
  new_value: string | null;
  old_is_active: boolean | null;
  new_is_active: boolean | null;
  changed_at: string;
}
export type MemoryValueSide = 'old' | 'new';

export async function fetchCoreMemoryHistory(userId: string, limit = 30) {
  const [current, history] = await Promise.all([
    supabase.from('vanguard_preferences').select('id,key,value,is_active,updated_at')
      .eq('user_id', userId).in('key', Object.keys(MEMORY_BLOCK_LABELS)),
    supabase.from('vanguard_core_memory_revisions')
      .select('id,preference_id,key,operation,old_value,new_value,old_is_active,new_is_active,changed_at', { count: 'exact' })
      .eq('user_id', userId).in('key', Object.keys(MEMORY_BLOCK_LABELS)).order('changed_at', { ascending: false }).order('id', { ascending: false }).limit(limit),
  ]);
  if (current.error) throw current.error;
  if (history.error) throw history.error;
  return {
    current: (current.data ?? []) as MemoryPreference[],
    revisions: (history.data ?? []) as MemoryRevision[],
    total: history.count ?? 0,
  };
}

export async function restoreCoreMemoryRevision(revisionId: string, expectedUpdatedAt: string, valueSide: MemoryValueSide = 'new') {
  const { error } = await supabase.rpc('restore_core_memory_revision', {
    p_revision_id: revisionId, p_expected_updated_at: expectedUpdatedAt, p_value_side: valueSide,
  });
  if (error) throw error;
}
