import { afterEach, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import { restoreCoreMemoryRevision } from './coreMemoryHistoryApi';

afterEach(() => vi.restoreAllMocks());

it('passes the chosen value side and unchanged concurrency token to the restore RPC', async () => {
  const rpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
    data: null,
    error: null,
    count: null,
    status: 204,
    statusText: 'No Content',
    success: true,
  });
  await restoreCoreMemoryRevision('revision', '2026-10-19T10:00:00Z', 'old');
  expect(rpc).toHaveBeenCalledWith('restore_core_memory_revision', {
    p_revision_id: 'revision', p_expected_updated_at: '2026-10-19T10:00:00Z', p_value_side: 'old',
  });
});
