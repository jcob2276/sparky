import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { useFinanceMutations, type FinanceAccount } from '../../lib/financeApi';
import { FinanceAccountsTab } from './FinanceAccountsTab';

vi.mock('./FinanceBankCard', () => ({ FinanceBankCard: () => null }));

it('shows the cash balance before editing and saves a correction from the account sheet', async () => {
  const account: FinanceAccount = { id: 'cash', user_id: 'u', name: 'Gotówka fizyczna', account_type: 'cash', balance: 5000,
    is_liquid: true, sort_order: 0, coingecko_id: null, crypto_amount: null, created_at: '' };
  const update = vi.fn(async () => undefined);
  function Accounts() {
    const mutations = useFinanceMutations(undefined);
    return <FinanceAccountsTab accounts={[account]} mutations={{ ...mutations, updateAccount: { ...mutations.updateAccount, mutateAsync: update } }} run={async fn => fn()} />;
  }
  render(<QueryClientProvider client={new QueryClient()}><Accounts /></QueryClientProvider>);
  const row = screen.getByRole('button', { name: 'Edytuj Gotówka fizyczna' });
  expect(row).toHaveTextContent('5000,00');
  expect(screen.queryByLabelText('Saldo Gotówka fizyczna')).not.toBeInTheDocument();
  fireEvent.click(row);
  const balance = await screen.findByLabelText('Saldo Gotówka fizyczna');
  expect(balance).toHaveValue(5000);
  fireEvent.change(balance, { target: { value: '5100' } });
  fireEvent.blur(balance);
  expect(update).not.toHaveBeenCalled();
  fireEvent.submit(screen.getByRole('button', { name: 'Zapisz saldo' }).closest('form')!);
  await waitFor(() => expect(update).toHaveBeenCalledWith({ id: 'cash', balance: 5100 }));
});
