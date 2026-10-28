import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMealComposer } from './useMealComposer';

const { fetchEntries } = vi.hoisted(() => ({ fetchEntries: vi.fn() }));
vi.mock('../../../../store/useStore', () => ({ useSession: () => ({ user: { id: 'owner' } }) }));
vi.mock('../../../../lib/health/composerTodayMealsApi', () => ({ fetchAllTodayEntries: fetchEntries }));
vi.mock('./useFoodEntrySearch', () => ({ useFoodEntrySearch: () => ({ setQuery: vi.fn(), setSelected: vi.fn() }) }));
vi.mock('./useMealComposerQueries', () => ({ useMealComposerQueries: () => ({
  contextQuery: {}, userPortionsQuery: {}, recentProductsQuery: {}, todayMealsQuery: {},
  allTodayEntriesQuery: {}, totals: { calories: 0, protein: 0, targetKcal: 2400, targetProtein: 150 },
}) }));
vi.mock('./useMealComposerSave', () => ({ useMealComposerSave: () => ({ saveDraft: vi.fn() }) }));
vi.mock('./useMealComposerCapture', () => ({ useMealComposerCapture: () => ({}) }));
vi.mock('./useMealComposerRefresh', () => ({ useMealComposerRefresh: () => vi.fn() }));
vi.mock('./useMealComposerQuickChips', () => ({ useMealComposerQuickChips: () => ({}) }));
vi.mock('./useNextMealSuggestions', () => ({ useNextMealSuggestions: () => ({}) }));
vi.mock('./useMealComposerBulkActions', () => ({ useMealComposerBulkActions: () => ({}) }));

const clients: QueryClient[] = [];
function mountComposer() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return renderHook(() => useMealComposer(), { wrapper: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  ) });
}

function returnAfterMidnight() {
  // Warsaw midnight is still the previous UTC date in winter.
  vi.setSystemTime(new Date('2026-10-28T23:01:00Z'));
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T22:59:00Z'));
  fetchEntries.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.useRealTimers();
});

it('refreshes today, yesterday and the default logging day on return after Warsaw midnight', async () => {
  const { result } = mountComposer();
  await waitFor(() => expect(fetchEntries).toHaveBeenCalledWith('owner', '2026-10-27'));
  expect(result.current.logDate).toBe('2026-10-28');
  act(returnAfterMidnight);

  expect(result.current.today).toBe('2026-10-29');
  expect(result.current.yesterday).toBe('2026-10-28');
  expect(result.current.logDate).toBe('2026-10-29');
  expect(result.current.isPastDay).toBe(false);
  await waitFor(() => expect(fetchEntries).toHaveBeenLastCalledWith('owner', '2026-10-28'));
});

it('preserves an explicitly selected historical day while refreshing day labels', () => {
  const { result } = mountComposer();
  act(() => result.current.setLogDate('2026-10-27'));
  act(returnAfterMidnight);

  expect(result.current.logDate).toBe('2026-10-27');
  expect(result.current.today).toBe('2026-10-29');
  expect(result.current.yesterday).toBe('2026-10-28');
  expect(result.current.isPastDay).toBe(true);
});

it('uses the new yesterday query when today is explicitly selected after midnight', async () => {
  const { result } = mountComposer();
  await waitFor(() => expect(fetchEntries).toHaveBeenCalledWith('owner', '2026-10-27'));
  act(returnAfterMidnight);
  act(() => result.current.setLogDate('2026-10-29'));
  expect(result.current.isPastDay).toBe(false);
  await waitFor(() => expect(fetchEntries).toHaveBeenLastCalledWith('owner', '2026-10-28'));
});

it('preserves yesterday selected after midnight before the day-change callback runs', () => {
  const { result } = mountComposer();
  vi.setSystemTime(new Date('2026-10-28T23:01:00Z'));
  act(() => result.current.setLogDate('2026-10-28'));
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(result.current.logDate).toBe('2026-10-28');
  expect(result.current.isPastDay).toBe(true);
});
