import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FinancePage from './FinancePage';

vi.mock('../../store/useStore', () => ({
  useStore: (sel: (s: { session: null }) => unknown) => sel({ session: null }),
}));

vi.mock('./useFinancePageData', () => ({
  useFinancePageData: () => ({
    bundleQuery: { isLoading: false, error: null },
    holdingsQuery: { isLoading: false },
    quotesQuery: { isLoading: false, isFetching: false },
    valuedHoldings: [],
    portfolio: { valuePln: 0, costPln: 0, pnlPln: 0, pnlPct: null, dayChangePln: 0, dayChangePct: null, unquotedCount: 0 },
    coinPricesQuery: { data: undefined, isFetching: false },
    data: undefined,
    metrics: null,
  }),
}));

vi.mock('../../lib/financeApi', () => ({
  useFinanceMutations: () => ({}),
}));

vi.mock('../../lib/finance/holdingsApi', () => ({
  useHoldingMutations: () => ({}),
}));

vi.mock('../../lib/finance/cashEntryApi', () => ({
  useCashEntryMutation: () => ({ isPending: false, mutateAsync: async () => undefined }),
}));

vi.mock('../../lib/finance/netWorthSnapshots', () => ({
  useNetWorthSnapshotSync: () => undefined,
}));

describe('FinancePage', () => {
  it('shows login gate without session', () => {
    render(
      <MemoryRouter>
        <FinancePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Zaloguj się/)).toBeInTheDocument();
  });
});
