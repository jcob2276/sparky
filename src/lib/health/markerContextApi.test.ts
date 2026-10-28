import { beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { useMarkerContext } from './markerContextApi';

const db = vi.hoisted(() => ({ runs: [] as Array<{ start_date: string; distance: number }> }));
vi.mock('../supabase', () => ({ supabase: { from: (table: string) => {
  let rows = table === 'strava_activities_clean' ? db.runs : [];
  const filter = (value: string, accepts: (a: number, b: number) => boolean) => {
    rows = rows.filter(row => accepts(Date.parse(row.start_date), Date.parse(value)));
    return query;
  };
  const query = {
    select: () => query, eq: () => query, in: () => query, not: () => query,
    gte: (_column: string, value: string) => filter(value, (a, b) => a >= b),
    lte: (_column: string, value: string) => filter(value, (a, b) => a <= b),
    lt: (_column: string, value: string) => filter(value, (a, b) => a < b),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return query;
} } }));

beforeEach(() => { db.runs = []; });

it.each([
  ['2026-03-01', '2026-04-25', '2026-02-28T23:00:00Z', '2026-04-25T22:00:00Z'],
  ['2026-09-01', '2026-10-26', '2026-08-31T22:00:00Z', '2026-10-26T23:00:00Z'],
])('includes the entire Warsaw marker window %s through %s', async (_from, to, start, end) => {
  db.runs = [
    { start_date: new Date(Date.parse(start) - 1).toISOString(), distance: 100_000 },
    { start_date: start, distance: 1000 },
    { start_date: new Date(Date.parse(start) + 30 * 60_000).toISOString(), distance: 2000 },
    { start_date: new Date(Date.parse(end) - 1).toISOString(), distance: 3000 },
    { start_date: end, distance: 100_000 },
  ];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result, unmount } = renderHook(() => useMarkerContext('owner', 'iron', to), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.lines[0]).toContain('6 km');
  expect(result.current.data?.lines[0]).toContain('3 biegach');
  unmount();
  client.clear();
});
