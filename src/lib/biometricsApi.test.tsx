import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayWarsaw } from './date';
import { useDailyStrainOura, useOuraContext, useOuraHistory30Days, useOuraNightDetails, useWeeklyBodyPulse } from './biometricsApi';

const database = vi.hoisted(() => ({ tables: {} as Record<string, { data: unknown; error: { message: string } | null }>, filters: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { from: (table: string) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn(function (this: unknown, column: string, value: string) { database.filters(table, 'eq', column, value); return this; }),
  gte: vi.fn(function (this: unknown, column: string, value: string) { database.filters(table, 'gte', column, value); return this; }),
  lte: vi.fn(function (this: unknown, column: string, value: string) { database.filters(table, 'lte', column, value); return this; }),
  order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
  then: (resolve: (value: { data: unknown; error: { message: string } | null }) => unknown) =>
    Promise.resolve(database.tables[table] ?? { data: [], error: null }).then(resolve),
}) } }));
const clients: QueryClient[] = [];
function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return renderHook(hook, { wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
}
beforeEach(() => { database.tables = {}; database.filters.mockClear(); });
afterEach(async () => { cleanup(); await act(async () => { clients.splice(0).forEach((client) => client.clear()); }); });

describe('partial biometric source failures', () => {
  it('rebuilds the cached night when enhanced sleep boundaries arrive later', async () => {
    database.tables = {
      oura_sleep_hr_timeline: { data: [
        { ts: '2026-10-16T02:00:00Z', bpm: 60 },
        { ts: '2026-10-16T10:00:00Z', bpm: 75 },
      ], error: null },
    };
    let start: string | null = null;
    let end: string | null = null;
    const { result, rerender } = setup(() => useOuraNightDetails('owner', '2026-10-16', start, end));
    await waitFor(() => expect(result.current.data?.heartRate).toHaveLength(2));
    start = '2026-10-15T22:00:00Z';
    end = '2026-10-16T06:00:00Z';
    rerender();
    await waitFor(() => expect(result.current.data?.heartRate).toEqual([{ ts: '2026-10-16T02:00:00Z', bpm: 60 }]));
    end = '2026-10-16T11:00:00Z';
    rerender();
    await waitFor(() => expect(result.current.data?.heartRate).toHaveLength(2));
    start = '2026-10-16T09:00:00Z';
    rerender();
    await waitFor(() => expect(result.current.data?.heartRate).toEqual([{ ts: '2026-10-16T10:00:00Z', bpm: 75 }]));
  });
  it('selects the workout date for the context of a night', async () => {
    const { result } = setup(() => useOuraContext('owner', '2026-10-15', null));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(database.filters).toHaveBeenCalledWith('workout_sessions', 'eq', 'date', '2026-10-15');
  });
  it('bounds weekly workouts by the actual date column rather than their workout name', async () => {
    const { result } = setup(() => useWeeklyBodyPulse('owner'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(database.filters).toHaveBeenCalledWith('workout_sessions', 'gte', 'date', expect.any(String));
    expect(database.filters).toHaveBeenCalledWith('workout_sessions', 'lte', 'date', getTodayWarsaw());
    expect(database.filters.mock.calls.some(([table, , column]) => table === 'workout_sessions' && column === 'workout_day')).toBe(false);
  });
  it('does not calculate a weekly summary from failed source reads as if they were empty', async () => {
    database.tables = { workout_sessions: { data: null, error: { message: 'workouts offline' } } };
    const { result } = setup(() => useWeeklyBodyPulse('owner'));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toContain('workout_sessions: workouts offline');
  });
  it('preserves the enhanced night if the daily summary read fails', async () => {
    const enhanced = { date: getTodayWarsaw(), total_sleep_hours: 7 };
    database.tables = {
      oura_daily_summary: { data: null, error: { message: 'summary offline' } },
      oura_enhanced: { data: [enhanced], error: null },
    };
    const { result } = setup(() => useDailyStrainOura('owner'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.enhanced).toEqual(enhanced);
    expect(result.current.data?.sourceErrors).toContainEqual({ source: 'oura_daily_summary', message: 'summary offline' });
  });
  it('retains known Oura readings while exposing failed strain and enhanced sources', async () => {
    const summary = { date: getTodayWarsaw(), readiness_score: 80 };
    database.tables = {
      daily_strain: { data: null, error: { message: 'permission denied' } },
      oura_daily_summary: { data: [summary], error: null },
      oura_enhanced: { data: null, error: { message: 'offline' } },
    };
    const { result } = setup(() => useDailyStrainOura('owner'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.oura).toEqual(summary);
    expect(result.current.data?.sourceErrors).toEqual(expect.arrayContaining([
      { source: 'daily_strain', message: 'permission denied' },
      { source: 'oura_enhanced', message: 'offline' },
    ]));
  });
  it('distinguishes a failed history source from a genuinely empty one', async () => {
    database.tables = {
      oura_daily_summary: { data: null, error: { message: 'history offline' } },
      oura_enhanced: { data: [{ date: getTodayWarsaw() }], error: null },
    };
    const { result } = setup(() => useOuraHistory30Days('owner'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.enhancedHistory).toHaveLength(1);
    expect(result.current.data?.sourceErrors).toEqual([{ source: 'oura_daily_summary', message: 'history offline' }]);
  });
  it('exposes failed night timelines without discarding the other recorded series', async () => {
    database.tables = {
      oura_sleep_phase_timeline: { data: null, error: { message: 'phases offline' } },
      oura_sleep_hr_timeline: { data: [{ ts: '2026-10-16T02:00:00Z', bpm: 60 }], error: null },
    };
    const { result } = setup(() => useOuraNightDetails('owner', getTodayWarsaw()));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.heartRate).toHaveLength(1);
    expect(result.current.data?.sourceErrors).toEqual([{ source: 'oura_sleep_phase_timeline', message: 'phases offline' }]);
  });
  it('exposes food context failure and preserves the known workout', async () => {
    database.tables = {
      daily_food_entries: { data: null, error: { message: 'food offline' } },
      workout_sessions: { data: [{ duration_minutes: 20, hr_strain_score: null, end_time: null }], error: null },
    };
    const { result } = setup(() => useOuraContext('owner', getTodayWarsaw(), null));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.training.durationMinutes).toBe(20);
    expect(result.current.data?.sourceErrors).toEqual([{ source: 'daily_food_entries', message: 'food offline' }]);
  });
});
