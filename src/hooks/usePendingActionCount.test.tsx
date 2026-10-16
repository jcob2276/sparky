import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchActionCenterCount } from '../lib/actionCenterApi';
import { syncFrictionProposals } from '../lib/systemProposals';
import { usePendingActionCount } from './usePendingActionCount';

const account = vi.hoisted(() => ({ id: 'alice' }));
vi.mock('../store/useStore', () => ({ useUserId: () => account.id }));
vi.mock('../lib/actionCenterApi', () => ({ fetchActionCenterCount: vi.fn(), fetchPendingClarificationRequests: vi.fn() }));
vi.mock('../lib/systemProposals', () => ({ syncFrictionProposals: vi.fn(), fetchPendingProposals: vi.fn(), resolveProposal: vi.fn() }));

const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return renderHook(() => usePendingActionCount(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  account.id = 'alice';
  vi.mocked(syncFrictionProposals).mockResolvedValue();
  vi.mocked(fetchActionCenterCount).mockImplementation(async (id) => id === 'alice' ? 3 : 8);
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); });

describe('pending action count', () => {
  it('refreshes the displayed count after invalidation', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.count).toBe(3));
    vi.mocked(fetchActionCenterCount).mockResolvedValue(5);
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.count).toBe(5));
  });

  it('uses the selected account rather than cached results from another account', async () => {
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.count).toBe(3));
    account.id = 'bob';
    rerender();
    await waitFor(() => expect(result.current.count).toBe(8));
    expect(fetchActionCenterCount).toHaveBeenLastCalledWith('bob');
  });

  it('does not fetch without a signed-in account', () => {
    account.id = '';
    const { result } = setup();
    expect(result.current.count).toBe(0);
    expect(fetchActionCenterCount).not.toHaveBeenCalled();
    expect(syncFrictionProposals).not.toHaveBeenCalled();
  });
});
