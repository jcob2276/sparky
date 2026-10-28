import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardQuery } from './dashboardApi';

const db = vi.hoisted(() => ({ missing: false, error: false }));
vi.mock('./supabase', () => ({ supabase: { from: (table: string) => {
  const day = { id: 'day', date: '2026-10-28', task_1: 'stale', done_1: false,
    daily_win_tasks: [{ slot: 1, title: 'Source task', done: true }] };
  const query = {
    select: () => query, eq: () => query, gte: () => query, lte: () => query, maybeSingle: () => query,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({
      data: table === 'vanguard_world_state' ? { state_json: { execution: { today_win: { task_1: 'Cached ghost' } } } }
        : table === 'daily_wins' ? (db.missing || db.error ? null : day) : [],
      error: table === 'daily_wins' && db.error ? { message: 'tasks offline' } : null,
    }).then(resolve),
  };
  return query;
} } }));

function dashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useDashboardQuery('owner'), {
    wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
  });
}
beforeEach(() => { db.missing = false; db.error = false; });

describe('dashboard daily win source', () => {
  it('shows normalized slots even when the cached world state contains wide columns', async () => {
    const { result } = dashboard();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.todayWin).toMatchObject({ task_1: 'Source task', done_1: true });
  });
  it('does not revive a deleted plan from nightly cached wide columns', async () => {
    db.missing = true;
    const { result } = dashboard();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.todayWin).toBeNull();
  });
  it('reports a failed task read instead of showing cached slot columns', async () => {
    db.error = true;
    const { result } = dashboard();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ message: 'tasks offline' });
  });
});
