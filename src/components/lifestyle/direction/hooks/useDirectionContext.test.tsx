import type { PropsWithChildren } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { useDirectionContext } from './useDirectionContext';

vi.mock('../../../../lib/directionApi', () => ({
  fetchActiveProjects: async () => [], fetchDirectionWeekBoard: async () => { throw new Error('goal_kpis offline'); },
}));
vi.mock('../../../../lib/goal/goalSpine', () => ({ fetchGoalSpine: async () => ({}), fetchLatestKpiValues: vi.fn() }));
vi.mock('../../../../lib/checkpoints', () => ({ fetchUpcomingCheckpoints: async () => [] }));
vi.mock('../../../../hooks/useGoalSpineInvalidation', () => ({ useGoalSpineInvalidation: () => {} }));
afterEach(cleanup);
it('keeps the failed planning source available to its consumers', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result, unmount } = renderHook(() => useDirectionContext('owner', '2026-10-12'), {
    wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.isError).toBe(true);
  expect(result.current.hasData).toBe(false);
  expect(result.current.error?.message).toBe('goal_kpis offline');
  unmount(); client.clear();
});

it('preserves a known context when its refresh fails', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  client.setQueryData(['direction-context', 'owner', '2026-10-12'], {
    weekStart: '2026-10-12', weekGoals: { intention: 'Zapisana intencja' }, activeProjects: [],
  });
  const { result, unmount } = renderHook(() => useDirectionContext('owner', '2026-10-12'), {
    wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.hasData).toBe(true);
  expect(result.current.weekGoals?.intention).toBe('Zapisana intencja');
  unmount(); client.clear();
});
