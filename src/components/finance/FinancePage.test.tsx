import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinanceBundle } from '../../lib/financeApi';
import { useFinanceMetrics } from './useFinanceMetrics';
import FinancePage from './FinancePage';

const state = vi.hoisted(() => ({ loggedIn: false, withMetrics: false }));
const bundle: FinanceBundle = {
  hasProfile: false,
  profile: { user_id: 'u', monthly_expenses: 0, monthly_income: 0, expected_return_pct: 0, inflation_pct: 0,
    safe_withdrawal_rate_pct: 4, emergency_target_months: 6, years_to_retirement: 20, net_worth_target: 100000, updated_at: '' },
  accounts: [{ id: 'cash', user_id: 'u', name: 'Gotówka fizyczna', account_type: 'cash', balance: 500,
    is_liquid: true, sort_order: 0, coingecko_id: null, crypto_amount: null, created_at: '' }],
  goals: [], wishlist: [], subscriptions: [], bills: [], transactions: [], incomeSources: [], snapshots: [],
};

vi.mock('../../store/useStore', () => ({
  useStore: (sel: (s: { session: { user: { id: string; email: string } } | null }) => unknown) =>
    sel({ session: state.loggedIn ? { user: { id: 'u', email: 'user@example.com' } } : null }),
}));

vi.mock('./useFinancePageData', () => ({
  useFinancePageData: () => ({
    bundleQuery: { isLoading: false, error: null },
    holdingsQuery: { isLoading: false },
    quotesQuery: { isLoading: false, isFetching: false },
    valuedHoldings: [],
    portfolio: { valuePln: 0, costPln: 0, pnlPln: 0, pnlPct: null, dayChangePln: 0, dayChangePct: null, unquotedCount: 0 },
    coinPricesQuery: { data: undefined, isFetching: false },
    data: state.loggedIn ? bundle : undefined,
    metrics: useFinanceMetrics(state.withMetrics ? bundle : undefined),
  }),
}));

vi.mock('../../lib/financeApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/financeApi')>(),
  useFinanceMutations: () => ({}),
  useFinanceBundle: () => ({ data: bundle }),
}));

vi.mock('../../lib/finance/holdingsApi', () => ({
  useHoldingMutations: () => ({ addPurchase: { isPending: false } }),
}));

vi.mock('../../lib/finance/bankApi', () => ({
  useBankData: () => ({ data: undefined, isLoading: false }),
  useBankActions: () => ({ connect: {}, sync: { mutate: vi.fn() }, assignCategory: {}, toggleVisibility: {} }),
}));

vi.mock('../../lib/finance/bankLinksApi', () => ({
  useFinanceBankLink: () => ({}),
  useResolveBankEntry: () => ({}),
}));

vi.mock('../../lib/finance/cashEntryApi', () => ({
  useCashEntryMutation: () => ({ isPending: false, mutateAsync: async () => undefined }),
}));

vi.mock('../../lib/finance/portfolioHistoryApi', () => ({
  usePortfolioPrices: () => ({ data: undefined, isLoading: false, isError: true }),
}));
vi.mock('../../lib/finance/netWorthSnapshots', () => ({
  useNetWorthSnapshotSync: () => undefined,
}));

beforeEach(() => {
  state.loggedIn = false;
  state.withMetrics = false;
  window.history.replaceState(null, '', '/finanse');
});
afterEach(cleanup);

function openFinance() {
  state.loggedIn = true;
  render(<MemoryRouter><FinancePage /></MemoryRouter>);
}

describe('FinancePage', () => {
  it('shows login gate without session', () => {
    render(
      <MemoryRouter>
        <FinancePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Zaloguj się/)).toBeInTheDocument();
  });

  it('keeps the three main destinations with the quick-entry plus in the middle of the bottom navigation', () => {
    openFinance();
    const nav = within(screen.getByRole('navigation', { name: 'Sekcje finansów' }));
    expect(nav.getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent))
      .toEqual(['Pulpit', 'Portfel', 'Szybki wpis', 'Przepływy']);
    fireEvent.click(nav.getByRole('button', { name: 'Portfel' }));
    expect(screen.getByRole('region', { name: 'Podsumowanie portfela' })).toBeInTheDocument();
  });

  it.each(['Pulpit', 'Portfel', 'Przepływy'])('opens quick entry from the bottom plus on %s', async (tabName) => {
    openFinance();
    const nav = within(screen.getByRole('navigation', { name: 'Sekcje finansów' }));
    fireEvent.click(nav.getByRole('button', { name: tabName }));
    expect(screen.queryByRole('group', { name: 'Kategoria' })).not.toBeInTheDocument();
    fireEvent.click(nav.getByRole('button', { name: 'Szybki wpis' }));
    expect(await screen.findByRole('group', { name: 'Kategoria' })).toBeInTheDocument();
  });

  it.each([false, true])('opens account management from the gear and returns to the source tab (metrics: %s)', async (withMetrics) => {
    state.withMetrics = withMetrics;
    openFinance();
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Portfel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Ustawienia finansów' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Edytuj Gotówka fizyczna' })).toHaveTextContent('500,00');
    expect(screen.getByRole('button', { name: 'Połącz Pekao' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Portfel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Portfel' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens settings from the existing account-management action in flows', () => {
    openFinance();
    fireEvent.click(screen.getByRole('button', { name: 'Przepływy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Przejdź do ustawień finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Ustawienia finansów' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Przepływy' })).toBeInTheDocument();
  });

  it.each(['connected', 'denied'])('keeps the bank callback in settings and returns to the dashboard (%s)', (result) => {
    window.history.replaceState(null, '', `/finanse?bank=${result}`);
    openFinance();
    expect(screen.getByRole('heading', { level: 1, name: 'Ustawienia finansów' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edytuj Gotówka fizyczna' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Finanse' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wróć do Sparky' })).toHaveAttribute('href', '/dzis');
  });
});
