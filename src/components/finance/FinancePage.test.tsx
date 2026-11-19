import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BankTransaction } from '../../lib/finance/bankApi';
import type { FinanceBundle } from '../../lib/financeApi';
import { useFinanceMetrics } from './useFinanceMetrics';
import FinancePage from './FinancePage';

const state = vi.hoisted(() => ({ loggedIn: false, withMetrics: false, historyLoading: false, bankRows: [] as BankTransaction[], assign: vi.fn() }));
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
    historyLoading: state.historyLoading,
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
  useBankData: () => ({ data: { connection: null, accounts: [], transactions: state.bankRows }, isLoading: false }),
  useBankActions: () => ({ connect: {}, sync: { mutate: vi.fn() }, assignCategory: { mutateAsync: state.assign }, toggleVisibility: {} }),
}));

vi.mock('../../lib/finance/categoryBudgetsApi', () => ({
  useCategoryBudgets: () => ({ data: {} }),
  useSetCategoryBudget: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../lib/finance/bankLinksApi', () => ({
  useFinanceBankLink: () => ({}),
  useResolveBankEntry: () => ({}),
}));

vi.mock('../../lib/finance/cashEntryApi', () => ({
  useCashEntryMutation: () => ({ isPending: false, mutateAsync: async () => undefined }),
}));

vi.mock('../../lib/finance/holdingEventsApi', () => ({
  useHoldingEvents: () => ({ data: { pages: [[]] }, isLoading: false, isError: false, hasNextPage: false }),
  useAllHoldingEvents: () => ({ data: [], isLoading: false, isError: false }),
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
  state.historyLoading = false;
  bundle.transactions = [];
  state.bankRows = [];
  state.assign.mockReset().mockResolvedValue(undefined);
  window.history.replaceState(null, '', '/finanse');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

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

  it('puts Start, Transakcje, Analiza and Portfel in the reference order', () => {
    openFinance();
    const nav = within(screen.getByRole('navigation', { name: 'Sekcje finansów' }));
    expect(nav.getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent))
      .toEqual(['Start', 'Transakcje', 'Analiza', 'Portfel']);
    fireEvent.click(nav.getByRole('button', { name: 'Portfel' }));
    expect(screen.getByRole('region', { name: 'Podsumowanie portfela' })).toBeInTheDocument();
  });

  it.each(['Start', 'Transakcje', 'Analiza', 'Portfel'])('opens quick entry from the header on %s', async (tabName) => {
    openFinance();
    const nav = within(screen.getByRole('navigation', { name: 'Sekcje finansów' }));
    fireEvent.click(nav.getByRole('button', { name: tabName }));
    expect(screen.queryByRole('group', { name: 'Kategoria' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Szybki wpis' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Transakcje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Przejdź do ustawień finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Ustawienia finansów' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Transakcje' })).toBeInTheDocument();
  });

  it('expands the selected category on Start and ranks recipients across the analysis period', () => {
    vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
    bundle.transactions = [
      { id: 'nov', user_id: 'u', amount: 40, category: 'Transport i paliwo', note: 'Przewoźnik', transaction_date: '2026-11-02', kind: 'expense', created_at: '' },
      { id: 'oct', user_id: 'u', amount: 30, category: 'Transport i paliwo', note: 'PRZEWOŹNIK', transaction_date: '2026-10-20', kind: 'expense', created_at: '' },
    ];
    openFinance();
    const category = screen.getByRole('button', { name: /^Transport/ });
    expect(category).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(category);
    expect(category).toHaveAttribute('aria-expanded', 'true');
    const categories = screen.getByRole('heading', { name: 'Kategorie' }).closest('section')!;
    expect(within(categories).getByText('Transport i paliwo')).toBeInTheDocument();
    fireEvent.click(category);
    expect(within(categories).queryByText('Transport i paliwo')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analiza' }));
    const ranking = screen.getByRole('region', { name: 'Najwięksi odbiorcy wydatków' });
    expect(within(ranking).getByText(/40,00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rok' }));
    expect(within(ranking).getByText(/70,00/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kategorie' })).not.toBeInTheDocument();
  });

  it('classifies an uncertain transaction with a new category and remembers its counterparty', async () => {
    vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
    state.bankRows = [{ id: 'unknown', account_id: 'bank', booking_date: '2026-11-02', amount: -40,
      currency: 'PLN', counterparty_name: 'Warsztat', remittance: null, category: 'do_sprawdzenia' }];
    openFinance();
    expect(screen.getByRole('navigation', { name: 'Sekcje finansów' }).parentElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: 'Transakcje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kategoryzacja' }));
    fireEvent.click(screen.getByRole('button', { name: /^Warsztat/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Nowa kategoria' }), { target: { value: '__new' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nazwa własnej kategorii' }), { target: { value: 'Naprawy' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Zakres zmiany' }), { target: { value: 'remember' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz kategorię' }));
    await waitFor(() => expect(state.assign).toHaveBeenCalledWith({ transactionId: 'unknown', category: 'custom:Naprawy', remember: true }));
  });

  it('does not display an empty analysis while linked bank data is loading', () => {
    state.historyLoading = true;
    openFinance();
    fireEvent.click(screen.getByRole('button', { name: 'Analiza' }));
    expect(screen.queryByRole('region', { name: 'Zestawienie okresu' })).not.toBeInTheDocument();
  });

  it.each(['connected', 'denied'])('keeps the bank callback in settings and returns to the dashboard (%s)', (result) => {
    window.history.replaceState(null, '', `/finanse?bank=${result}`);
    openFinance();
    expect(screen.getByRole('heading', { level: 1, name: 'Ustawienia finansów' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edytuj Gotówka fizyczna' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do finansów' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Twój kapitał. Twój kierunek.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do Sparky' })).toBeInTheDocument();
  });
});
