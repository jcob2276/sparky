import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNutritionData } from './useNutritionData';

const db = vi.hoisted(() => ({ load: vi.fn(), entries: [] as unknown[] }));
vi.mock('../../store/useStore', () => ({ useUserId: () => 'u' }));
vi.mock('../../hooks/useHaptics', () => ({ useHaptics: () => ({ light: vi.fn() }) }));
vi.mock('../../lib/health/nutritionDashboardData', () => ({ loadNutritionDashboard: (...args: unknown[]) => db.load(...args) }));
vi.mock('../../lib/health/nutritionDashboardApi', () => ({ removeNutritionEntry: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-19T10:00:00Z'));
  db.entries = [];
  db.load.mockReset().mockImplementation(async () => ({ rows: [], todayEntries: [...db.entries] }));
});
afterEach(() => vi.useRealTimers());

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook((props: { weeklyCalories: number }) => useNutritionData(props), {
    wrapper, initialProps: { weeklyCalories: 0 },
  });
  return { ...hook, client };
}

describe('nutrition data freshness', () => {
  it('does not restart fetching on each render', async () => {
    const hook = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(80); });
    expect(db.load).toHaveBeenCalledTimes(1);
    hook.unmount();
    hook.client.clear();
  });

  it('refreshes meals logged outside this tab', async () => {
    const hook = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(hook.result.current.loading).toBe(false);
    db.entries = [{ id: 'telegram-meal', calories: 436, protein: 30, name: 'Parówki' }];
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(db.load).toHaveBeenCalledTimes(2);
    expect(hook.result.current.todayEntries).toHaveLength(1);
    hook.unmount();
    hook.client.clear();
  });

  it('uses a new cache entry when the Warsaw day changes', async () => {
    const hook = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(db.load).toHaveBeenCalledWith('u', '2026-10-19');
    act(() => {
      vi.setSystemTime(new Date('2026-10-19T22:01:00Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(db.load).toHaveBeenCalledWith('u', '2026-10-20');
    hook.unmount();
    hook.client.clear();
  });
});
