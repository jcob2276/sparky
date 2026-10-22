import { createElement, type ReactNode } from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFinanceBundle, useFinanceMutations, type FinanceIncomeSource, type FinanceWishlistItem, type FinanceTransaction, type FinanceSnapshot } from './financeApi';
import { useFinanceMetrics } from '../components/finance/useFinanceMetrics';
import { buildTodayContext, buildTodayHeadline } from '../components/finance/financeNarrative';
import { FinanceTabContent, type FinanceTabKey } from '../components/finance/FinanceTabContent';

const source = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  wishlist: [] as FinanceWishlistItem[],
  income: [] as FinanceIncomeSource[],
  transactions: [] as FinanceTransaction[],
  snapshots: [] as FinanceSnapshot[],
  failedPage: false,
}));
vi.mock('./supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://example.supabase.co', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchRecords },
  }) };
});

async function fetchRecords(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
  const req = new Request(input, init);
  const url = new URL(req.url);
  expect(url.hostname).toBe('example.supabase.co');
  expect(req.method).toBe('GET');
  expect(url.searchParams.get('user_id')).toBe('eq.owner');
  const table = url.pathname.split('/').pop();
  if (table === 'finance_snapshots') {
    const direction = url.searchParams.get('order')?.includes('.desc') ? -1 : 1;
    return Response.json([...source.snapshots]
      .sort((a, b) => direction * a.snapshot_month.localeCompare(b.snapshot_month))
      .slice(0, Number(url.searchParams.get('limit') ?? 1000)));
  }
  if (table === 'finance_transactions') {
    let rows = source.transactions.filter(row => row.user_id === 'owner');
    for (const filter of url.searchParams.getAll('transaction_date')) {
      if (filter.startsWith('gte.')) rows = rows.filter(row => row.transaction_date >= filter.slice(4));
      if (filter.startsWith('lt.')) rows = rows.filter(row => row.transaction_date < filter.slice(3));
    }
    rows.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.id.localeCompare(a.id));
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 1000));
    if (source.failedPage && offset > 0) return Response.json({ message: 'month page unavailable' }, { status: 400 });
    return Response.json(rows.slice(offset, offset + limit), {
      headers: { 'Content-Range': `${offset}-${offset + Math.min(limit, rows.length - offset) - 1}/${rows.length}` },
    });
  }
  return Response.json(table === 'finance_profile' ? source.profile
    : table === 'finance_wishlist' ? source.wishlist : table === 'finance_income_sources' ? source.income : []);
}

beforeEach(() => {
  source.profile = null; source.wishlist = []; source.income = [];
  source.transactions = []; source.snapshots = []; source.failedPage = false;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
});
afterEach(() => { vi.useRealTimers(); });

function useBudget() {
  const query = useFinanceBundle('owner');
  return { query, metrics: useFinanceMetrics(query.data) };
}

function renderBudget() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } } });
  return renderHook(useBudget, {
    wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children),
  });
}

it('does not invent income, expenses or a spending allowance before a budget profile exists', async () => {
  const { result } = renderBudget();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.query.data?.profile.monthly_income).toBe(0);
  expect(result.current.query.data?.profile.monthly_expenses).toBe(0);
  expect(buildTodayHeadline(result.current.metrics!)).toBe('—');
  expect(buildTodayContext(result.current.metrics!)).toMatch(/Wpisz plan wydatków/);
});

it('keeps the saved budget values and shows the calculated allowance when a profile exists', async () => {
  source.profile = {
    user_id: 'owner', monthly_income: 9000, monthly_expenses: 4500,
    expected_return_pct: 7, inflation_pct: 3, safe_withdrawal_rate_pct: 4,
    emergency_target_months: 6, years_to_retirement: 20, updated_at: '2026-10-17T10:00:00Z',
  };
  const { result } = renderBudget();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.metrics?.effectiveIncome).toBe(9000);
  expect(result.current.metrics?.effectiveExpenses).toBe(4500);
  expect(buildTodayHeadline(result.current.metrics!)).not.toBe('—');
});

function BudgetTab({ tab }: { tab: FinanceTabKey }) {
  const { query, metrics } = useBudget();
  const mutations = useFinanceMutations('owner');
  if (!query.data || !metrics) return null;
  return <FinanceTabContent tab={tab} data={query.data} metrics={metrics} mutations={mutations}
    run={async (fn) => fn()} saveProfilePatch={() => {}} />;
}

it.each(['today', 'flows'] as const)('keeps actual records and inputs in %s without inventing results from a missing budget', async (tab) => {
  source.income = [{ id: 'pay', user_id: 'owner', name: 'Pensja', amount_monthly: 7000,
    source_type: 'salary', is_active: true, created_at: '2026-10-17T10:00:00Z' }];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><BudgetTab tab={tab} /></QueryClientProvider>);
  if (tab === 'flows') {
    await screen.findByText('Pensja');
    expect(screen.getByLabelText(/Plan wydatków na miesiąc/)).toHaveValue(null);
  } else {
    await screen.findByText(/Wpisz plan wydatków/);
    expect(screen.queryByText('Zostało w miesiącu')).not.toBeInTheDocument();
  }
});

function transaction(id: string, date = '2026-10-16'): FinanceTransaction {
  return { id, user_id: 'owner', amount: 1, kind: 'expense', category: 'Inne', note: null,
    transaction_date: date, created_at: `${date}T12:00:00Z` };
}

it('counts the entire current month beyond both the recent-list limit and a server page cap without duplicates', async () => {
  source.transactions = Array.from({ length: 501 }, (_, i) => transaction(`expense-${String(i).padStart(4, '0')}`));
  source.transactions.push({ ...transaction('income'), kind: 'income', amount: 9000 },
    transaction('future', '2026-11-02'), { ...transaction('foreign'), user_id: 'other', amount: 99999 });
  const { result } = renderBudget();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.metrics?.spentThisMonth).toBe(501);
  expect(result.current.query.data?.transactions).toHaveLength(503);
  expect(result.current.query.data?.transactions[0].id).toBe('future');
});

it('keeps recent historical records when the current month is empty', async () => {
  source.transactions = [transaction('past', '2026-09-30')];
  const { result } = renderBudget();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.query.data?.transactions.map(row => row.id)).toEqual(['past']);
  expect(result.current.metrics?.spentThisMonth).toBe(0);
});

it('reports a failed month page instead of calculating with only the accepted pages', async () => {
  source.transactions = Array.from({ length: 201 }, (_, i) => transaction(`expense-${i}`));
  source.failedPage = true;
  const { result } = renderBudget();
  await waitFor(() => expect(result.current.query.isError).toBe(true));
  expect(result.current.query.error?.message).toBe('month page unavailable');
  expect(result.current.metrics).toBeNull();
});

it('loads the new Warsaw month when an open finance view becomes visible after midnight', async () => {
  source.transactions = [transaction('october-1'), transaction('october-2'),
    ...Array.from({ length: 201 }, (_, i) => transaction(`november-${i}`, '2026-11-01'))];
  const { result } = renderBudget();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.metrics?.spentThisMonth).toBe(2);
  vi.setSystemTime(new Date('2026-11-01T06:00:00Z'));
  fireEvent(document, new Event('visibilitychange'));
  await waitFor(() => expect(result.current.metrics?.spentThisMonth).toBe(201));
  expect(result.current.metrics?.monthKey).toBe('2026-11');
});

it('returns the latest two years of snapshots in chronological order', async () => {
  source.snapshots = Array.from({ length: 30 }, (_, month) => ({
    id: `snapshot-${month}`,
    user_id: 'owner',
    snapshot_month: `${2024 + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, '0')}-01`,
    net_worth: month,
    liquid_cash: 0,
    investments: month,
    debts: 0,
    created_at: '2026-10-17T12:00:00Z',
  }));
  const { result } = renderBudget();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.query.data?.snapshots).toHaveLength(24);
  expect(result.current.query.data?.snapshots[0].snapshot_month).toBe('2024-07-01');
  expect(result.current.query.data?.snapshots[23].snapshot_month).toBe('2026-06-01');
});
