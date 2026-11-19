import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { FinanceAccount, FinanceBundle } from '../../lib/financeApi';
import FinanceReferenceStart from './FinanceReferenceStart';
import { useFinanceMetrics } from './useFinanceMetrics';

const account = (id: string, account_type: string, balance: number, is_liquid: boolean): FinanceAccount => ({
  id, user_id: 'user', name: id, account_type, balance, is_liquid, sort_order: 0,
  coingecko_id: null, crypto_amount: null, created_at: '',
});
const data: FinanceBundle = {
  hasProfile: true,
  profile: { user_id: 'user', monthly_expenses: 100, monthly_income: 0, expected_return_pct: 0, inflation_pct: 0,
    safe_withdrawal_rate_pct: 4, emergency_target_months: 6, years_to_retirement: 20, net_worth_target: 100000, updated_at: '' },
  accounts: [
    account('Konto', 'bank', 500, true),
    account('Oszczędności', 'savings', 300, true),
    account('Gotówka u brokera', 'broker_cash', 100, false),
    account('Inna inwestycja', 'investment', 50, false),
  ],
  goals: [], wishlist: [], subscriptions: [], bills: [], transactions: [], incomeSources: [], snapshots: [],
};

it('toggles savings only in the displayed wealth and breaks out the existing portfolio exactly once', () => {
  const onPortfolio = vi.fn();
  function Example() {
    const metrics = useFinanceMetrics(data, 1200);
    return <FinanceReferenceStart data={data} metrics={metrics} portfolioValue={1200} month="2026-11"
      onPortfolio={onPortfolio} onAccounts={vi.fn()} onTransactions={vi.fn()} onSelect={vi.fn()} />;
  }

  render(<Example />);
  const wealth = screen.getByRole('region', { name: 'Wartość netto' });
  expect(within(wealth).getByText('1850,00 zł')).toBeInTheDocument();
  expect(within(wealth).getByText('1300,00 zł')).toBeInTheDocument();
  expect(within(wealth).getByText('50,00 zł')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Poduszka finansowa' })).toHaveTextContent('14 700,00 zł');

  fireEvent.click(screen.getByRole('switch', { name: 'Uwzględnij oszczędności' }));
  expect(within(wealth).getByText('2150,00 zł')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Poduszka finansowa' })).toHaveTextContent('14 700,00 zł');
  fireEvent.click(within(wealth).getByRole('button', { name: 'Portfel XTB' }));
  expect(onPortfolio).toHaveBeenCalledOnce();
});
