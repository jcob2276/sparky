import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupplementLog } from './supplementsClient';
import { supplementsKeys } from './supplementsApi';
import { buildQuickLog, useQuickLogSupplement } from './supplementQuickLogApi';

const db = vi.hoisted(() => ({ insert: vi.fn(), eqId: vi.fn(), result: { error: null as unknown } }));

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => { db.insert(row); return Promise.resolve(db.result); },
      delete: () => ({
        eq: () => ({ eq: (col: string, id: string) => { db.eqId(col, id); return Promise.resolve(db.result); } }),
      }),
    }),
  },
}));
vi.mock('../offlineQueue', () => ({ isOfflineError: () => false, queueOfflineWrite: vi.fn() }));

const KEY = supplementsKeys.logs('u', '2026-09-01');

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  client.setQueryData<SupplementLog[]>(KEY, []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, invalidate, ...renderHook(() => useQuickLogSupplement('u', '2026-09-01'), { wrapper }) };
}

describe('buildQuickLog', () => {
  it('ustawia jawnie logged_at na chwilę kliknięcia (instant ISO) i nadaje id po stronie klienta', () => {
    const log = buildQuickLog('u', 's1', '2026-09-21', new Date('2026-09-21T19:30:00Z'));
    expect(log).toMatchObject({
      user_id: 'u', supplement_id: 's1', date: '2026-09-21', quantity: 1, logged_at: '2026-09-21T19:30:00.000Z',
    });
    expect(log.id).toBeTruthy();
  });
});

describe('useQuickLogSupplement', () => {
  beforeEach(() => {
    db.insert.mockClear();
    db.eqId.mockClear();
    db.result.error = null;
  });

  it('dodaje wpis optymistycznie, zapisuje i odświeża listę suple oraz wykres dzień→noc', async () => {
    const { result, client, invalidate } = setup();
    const log = buildQuickLog('u', 's1', '2026-09-21');
    act(() => { result.current.mutate({ kind: 'log', log }); });
    await waitFor(() => expect(client.getQueryData<SupplementLog[]>(KEY)).toEqual([log]));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(db.insert).toHaveBeenCalledWith(log);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: supplementsKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['oura-day-night', 'u'] });
  });

  it('cofa optymistyczny wpis przy błędzie zapisu', async () => {
    db.result.error = new Error('boom');
    const { result, client } = setup();
    act(() => { result.current.mutate({ kind: 'log', log: buildQuickLog('u', 's1', '2026-09-21') }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<SupplementLog[]>(KEY)).toEqual([]);
  });

  it('usuwa wpis po konkretnym id', async () => {
    const { result, client } = setup();
    const log = buildQuickLog('u', 's1', '2026-09-21');
    client.setQueryData<SupplementLog[]>(KEY, [log]);
    act(() => { result.current.mutate({ kind: 'unlog', logId: log.id, supplementId: 's1' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(db.eqId).toHaveBeenCalledWith('id', log.id);
    expect(client.getQueryData<SupplementLog[]>(KEY)).toEqual([]);
  });
});
