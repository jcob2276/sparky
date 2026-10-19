import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import * as api from '../../lib/coreMemoryHistoryApi';
import { useCoreMemoryHistory } from './useCoreMemoryHistory';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const revision: api.MemoryRevision = { id: 'revision', preference_id: 'preference', key: 'core_memory:focus',
  operation: 'update', old_value: 'Przed zmianą', new_value: 'Po zmianie', old_is_active: false, new_is_active: true, changed_at: '2026-10-18T10:00:00Z' };

it('refresh clears a restore conflict, and old-side restoration uses the refreshed concurrency token', async () => {
  let updatedAt = '2026-10-19T10:00:00Z';
  vi.spyOn(api, 'fetchCoreMemoryHistory').mockImplementation(async () => ({
    current: [{ id: 'preference', key: revision.key, value: revision.new_value!, is_active: true, updated_at: updatedAt }],
    revisions: [revision], total: 1,
  }));
  const restore = vi.spyOn(api, 'restoreCoreMemoryRevision').mockRejectedValueOnce(new Error('conflict')).mockResolvedValueOnce(undefined);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useCoreMemoryHistory('owner'), { wrapper });
  act(() => result.current.onExpand(true));
  await waitFor(() => expect(result.current.current).toHaveLength(1));
  act(() => result.current.onRestore(revision, 'old'));
  await waitFor(() => expect(result.current.error).toBeTruthy());
  updatedAt = '2026-10-19T11:00:00Z';
  act(() => result.current.onRefresh());
  await waitFor(() => expect(result.current.current[0].updated_at).toBe('2026-10-19T11:00:00Z'));
  expect(result.current.error).toBeNull();
  act(() => result.current.onRestore(revision, 'old'));
  await waitFor(() => expect(result.current.restored).toBe(true));
  expect(restore).toHaveBeenLastCalledWith('revision', '2026-10-19T11:00:00Z', 'old');
  act(() => result.current.onRefresh());
  await waitFor(() => expect(result.current.restored).toBe(false));
});
