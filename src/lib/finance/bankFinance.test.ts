import { describe, expect, it } from 'vitest';
import { mergeBankFinance } from './bankFinance';
import type { FinanceBundle } from '../financeApi';
import type { BankData } from './bankApi';

const bundle: FinanceBundle = { hasProfile: false, profile: { user_id: 'u', monthly_expenses: 0, monthly_income: 0, expected_return_pct: 0, inflation_pct: 0, safe_withdrawal_rate_pct: 4, emergency_target_months: 6, years_to_retirement: 20, net_worth_target: 0, updated_at: '' },
  accounts: [{ id: 'f', user_id: 'u', name: 'Konto', balance: 999, account_type: 'bank', is_liquid: true, sort_order: 0, coingecko_id: null, crypto_amount: null, created_at: '', bank_account_id: 'a' }],
  transactions: [{ id: 'manual', user_id: 'u', account_id: 'f', amount: -20, category: 'Zakupy', note: null, transaction_date: '2026-11-01', kind: 'expense', created_at: '', bank_transaction_id: 't', bank_reconciled: true }],
  goals: [], wishlist: [], subscriptions: [], bills: [], incomeSources: [], snapshots: [] };
const bank: BankData = { connection: null, accounts: [{ id: 'a', iban: null, name: 'Bank', balance: 100, currency: 'PLN', balance_synced_at: null }], transactionCount: 2,
  transactions: [{ id: 't', account_id: 'a', amount: -20, category: 'zakupy', currency: 'PLN', booking_date: '2026-11-01', counterparty_name: 'Sklep', remittance: null, status: 'BOOK' },
    { id: 'refund', account_id: 'a', amount: 10, category: 'zwrot', currency: 'PLN', booking_date: '2026-11-02', counterparty_name: 'Sklep', remittance: null, status: 'BOOK' }] };

it('replaces linked balances and transactions without copying or double-counting manual entries', () => {
  const result = mergeBankFinance(bundle, bank, '2026-11-07');
  expect(result.accounts[0].balance).toBe(100);
  expect(result.transactions.map(t => t.id)).toEqual(['bank:refund', 'bank:t']);
  expect(result.transactions[0].flow_kind).toBe('refund');
  expect(bundle.accounts[0].balance).toBe(999);
});
describe('bank-finance availability', () => {
  it('does not substitute missing balances with stale manual values', () => {
    expect(() => mergeBankFinance(bundle, { ...bank, accounts: [] }, '2026-11-07')).toThrow(/sald/i);
  });
  it('keeps unlinked manual accounts unchanged', () => {
    const manual = { ...bundle, accounts: bundle.accounts.map(a => ({ ...a, bank_account_id: null })), transactions: bundle.transactions.map(t => ({ ...t, bank_transaction_id: null })) };
    expect(mergeBankFinance(manual, bank, '2026-11-07').transactions).toEqual(manual.transactions);
  });
  it('preserves unmatched manual entries and requires reconciliation instead of silently suppressing them', () => {
    const manual = { ...bundle, transactions: bundle.transactions.map(t => ({ ...t, bank_transaction_id: null, bank_reconciled: false })) };
    const result = mergeBankFinance(manual, bank, '2026-11-07');
    expect(result.transactions.some(t => t.id === 'manual')).toBe(true);
    expect(result.bankReconciliationPending).toBe(1);
    expect(mergeBankFinance({ ...manual, transactions: manual.transactions.map(t => ({ ...t, bank_reconciled: true })) }, bank, '2026-11-07').bankReconciliationPending).toBe(0);
  });
  it('retains a manual fact when the matched bank entry is still pending or missing', () => {
    const result = mergeBankFinance(bundle, { ...bank, transactions: bank.transactions.map(t => ({ ...t, status: 'PDNG' })) }, '2026-11-07');
    expect(result.transactions.map(t => t.id)).toEqual(['manual']);
  });
});
