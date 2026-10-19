import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supplementsKeys, useSupplementLogs, useToggleSupplement } from './supplementsApi';
import type { SupplementLog } from './supplementsClient';

const db = vi.hoisted(() => ({ logs: [] as SupplementLog[], fetchLogs: vi.fn() }));
vi.mock('./supplementsClient', () => ({
  fetchSupplementLogsSince: () => { db.fetchLogs(); return Promise.resolve([...db.logs]); },
  fetchSupplements: vi.fn(), saveSupplement: vi.fn(),
}));
vi.mock('../supabase', () => ({ supabase: { from: () => ({
  insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: db.logs[0], error: null }) }) }),
}) } }));

const log: SupplementLog = {
  id: 'telegram-log', user_id: 'u', supplement_id: 'omega', date: '2026-10-19',
  logged_at: '2026-10-19T07:48:00Z', quantity: 3, note: null,
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, notifyOnChangeProps: 'all' } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

afterEach(() => { vi.useRealTimers(); db.logs = []; db.fetchLogs.mockClear(); });

describe('supplement logs shared by Telegram and the app', () => {
  it('refreshes a mounted view after a Telegram write without another click', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useSupplementLogs('u', '2026-10-01'), { wrapper });
    await act(async () => { expect((await hook.result.current.refetch({ throwOnError: true })).data).toEqual([]); });
    await waitFor(() => expect(client.getQueryData(supplementsKeys.logs('u', '2026-10-01'))).toEqual([]));
    db.logs = [log];
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await waitFor(() => expect(client.getQueryData(supplementsKeys.logs('u', '2026-10-01'))).toEqual([log]));
    hook.unmount();
    client.clear();
  });

  it('invalidates every date window and the Oura timeline after a toggle elsewhere', async () => {
    const { client, wrapper } = setup();
    const otherWindow = supplementsKeys.logs('u', '2026-09-01');
    const timeline = ['oura-day-night', 'u', '2026-10-19'];
    client.setQueryData(otherWindow, []);
    client.setQueryData(timeline, {});
    db.logs = [log];
    const hook = renderHook(() => useToggleSupplement(), { wrapper });
    await act(async () => { await hook.result.current.mutateAsync({ userId: 'u', supplementId: 'omega', date: log.date, sinceDate: '2026-10-01' }); });
    expect(client.getQueryState(otherWindow)?.isInvalidated).toBe(true);
    expect(client.getQueryState(timeline)?.isInvalidated).toBe(true);
    hook.unmount();
    client.clear();
  });
});
