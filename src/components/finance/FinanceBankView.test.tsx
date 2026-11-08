import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinanceBankView } from './FinanceBankView';
import type { BankData } from '../../lib/finance/bankApi';

afterEach(cleanup);
const data: BankData = {
  connection: { id: 'c', aspsp_name: 'Bank', status: 'active', valid_until: null, last_synced_at: null, last_error: null, last_note: null },
  accounts: [{ id: 'a', iban: 'PL1234', name: 'Konto', currency: 'PLN', balance: 500, balance_synced_at: null, history_complete: false }],
  hiddenAccounts: [],
  transactions: [{ id: 't', account_id: 'a', amount: -20, currency: 'PLN', booking_date: '2026-11-03', counterparty_name: 'Sklep', remittance: 'Opis', category: 'zakupy', status: 'BOOK' },
    { id: 't2', account_id: 'a', amount: -9, currency: 'PLN', booking_date: '2026-10-03', counterparty_name: 'Stary sklep', remittance: null, category: 'zakupy', status: 'BOOK' }],
  transactionCount: 2,
};
const props = { data, health: { kind: 'ok', daysLeft: null } as const, loading: false, connecting: false, syncing: false, assigning: false,
  mode: 'activity' as const,
  onConnect: vi.fn(), onSync: vi.fn(), onAssignCategory: vi.fn(async () => true) };

describe('bank view', () => {
  it('shows spending categories on the dashboard without hiding them or duplicating the history', () => {
    const open = vi.fn();
    render(<FinanceBankView {...props} mode="overview" onOpenDetails={open} />);
    expect(screen.getByText('Na co wychodzi')).toBeVisible();
    expect(screen.getByText('Zakupy')).toBeVisible();
    expect(screen.queryByText('Historia transakcji')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pełna analiza i historia' }));
    expect(open).toHaveBeenCalledOnce();
  });
  it('keeps unavailable linked accounts recoverable without repeating visible balances', () => {
    const missing = { id: 'missing', user_id: 'u', name: 'Ukryty rachunek', balance: 100, account_type: 'bank', is_liquid: true, bank_account_id: 'hidden', sort_order: 0, coingecko_id: null, crypto_amount: null, created_at: '' };
    const remove = vi.fn();
    render(<FinanceBankView {...props} mode="accounts" missingAccounts={[missing]} onRemoveMissingAccount={remove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Usuń konto z Finansów' }));
    expect(remove).toHaveBeenCalledWith(missing);
    expect(screen.queryByLabelText('Szukaj transakcji')).not.toBeInTheDocument();
  });
  it('keeps account management separate from transaction analysis', () => {
    const view = render(<FinanceBankView {...props} mode="accounts" />);
    expect(screen.getByText(/Aktualizacja transakcji:/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Szukaj transakcji')).not.toBeInTheDocument();
    view.rerender(<FinanceBankView {...props} />);
    expect(screen.queryByText(/Aktualizacja transakcji:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Szukaj transakcji')).toBeInTheDocument();
  });
  it('filters the complete history by month and search', () => {
    render(<FinanceBankView {...props} />);
    fireEvent.change(screen.getByLabelText('Miesiąc'), { target: { value: '2026-10' } });
    expect(screen.getByRole('button', { name: 'Zmień kategorię: Stary sklep' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zmień kategorię: Sklep' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Szukaj transakcji'), { target: { value: 'nie ma' } });
    expect(screen.getByText('Brak transakcji dla tych filtrów.')).toBeInTheDocument();
  });
  it('edits recognised categories and defaults to a single transaction', async () => {
    const save = vi.fn(async () => true);
    render(<FinanceBankView {...props} onAssignCategory={save} />);
    fireEvent.change(screen.getByLabelText('Miesiąc'), { target: { value: '2026-11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zmień kategorię: Sklep' }));
    fireEvent.change(screen.getByLabelText('Nowa kategoria'), { target: { value: 'zdrowie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz kategorię' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ transactionId: 't', category: 'zdrowie', remember: false }));
  });
  it('shows a read error instead of suggesting an empty bank', () => {
    render(<FinanceBankView {...props} data={undefined} error="Nie można pobrać historii" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nie można pobrać historii');
  });
  it('renders hidden accounts with restore action', () => {
    const onToggle = vi.fn();
    const dataWithHidden: BankData = {
      ...data,
      hiddenAccounts: [{ id: 'h1', iban: 'PL9999', name: 'Pekao puste', currency: 'PLN', balance: 0, balance_synced_at: null, hidden: true }],
    };
    render(<FinanceBankView {...props} mode="accounts" data={dataWithHidden} onToggleVisibility={onToggle} />);
    expect(screen.getByText(/Ukryte rachunki \(1\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Przywróć rachunek' }));
    expect(onToggle).toHaveBeenCalledWith(dataWithHidden.hiddenAccounts?.[0], false);
  });
});
