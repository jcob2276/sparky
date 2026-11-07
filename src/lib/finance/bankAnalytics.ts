import { normalizeBankText } from '@vanguard/domain';
import type { BankTransaction } from './bankApi';
import { summarizeSpending } from './bankSpending';

export type BankMovement = 'income' | 'expense' | 'refund' | 'transfer' | 'investment' | 'cash';
export interface BankFilters {
  month?: string;
  accountId?: string;
  currency: string;
  today?: string;
  search?: string;
  category?: string;
  direction?: string;
  counterparty?: string;
  bookedOnly?: boolean;
}
export interface BankPartyTotal { key: string; name: string; total: number; count: number }

export function bankMovement(tx: Pick<BankTransaction, 'category' | 'amount'>): BankMovement {
  if (tx.category === 'przelewy_wlasne') return 'transfer';
  if (tx.category === 'inwestycje') return 'investment';
  if (tx.category === 'gotowka') return 'cash';
  if (tx.category === 'zwrot' && tx.amount > 0) return 'refund';
  return tx.amount > 0 ? 'income' : 'expense';
}

export function isBankBooked(tx: BankTransaction): boolean {
  return tx.status === 'BOOK' || tx.status === undefined;
}

export function filterBankTransactions(rows: readonly BankTransaction[], filters: BankFilters): BankTransaction[] {
  const search = normalizeBankText(filters.search ?? '');
  return rows.filter(tx => {
    if (tx.currency !== filters.currency) return false;
    if (filters.accountId && tx.account_id !== filters.accountId) return false;
    if (filters.today && (!tx.booking_date || tx.booking_date > filters.today)) return false;
    if (filters.bookedOnly && !isBankBooked(tx)) return false;
    if (filters.month && !tx.booking_date?.startsWith(`${filters.month}-`)) return false;
    if (filters.category === 'do_sprawdzenia' ? tx.category && tx.category !== 'do_sprawdzenia'
      : filters.category && tx.category !== filters.category) return false;
    if (filters.direction === 'credit' && tx.amount <= 0) return false;
    if (filters.direction === 'debit' && tx.amount >= 0) return false;
    if (filters.direction === 'pending' && isBankBooked(tx)) return false;
    if (['income', 'expense', 'transfer', 'investment', 'cash', 'refund'].includes(filters.direction ?? '') && bankMovement(tx) !== filters.direction) return false;
    if (filters.counterparty && normalizeBankText(tx.counterparty_name) !== filters.counterparty) return false;
    return !search || normalizeBankText(`${tx.counterparty_name ?? ''} ${tx.remittance ?? ''}`).includes(search);
  }).sort((a, b) => (b.booking_date ?? '').localeCompare(a.booking_date ?? '') || b.id.localeCompare(a.id));
}

function partyTotals(rows: BankTransaction[]): BankPartyTotal[] {
  const groups = new Map<string, BankPartyTotal>();
  for (const tx of rows) {
    const name = tx.counterparty_name || 'Nieznany kontrahent';
    const key = normalizeBankText(name);
    const group = groups.get(key) ?? { key, name, total: 0, count: 0 };
    group.total += Math.round(Math.abs(tx.amount) * 100);
    group.count++;
    groups.set(key, group);
  }
  return [...groups.values()].map(g => ({ ...g, total: g.total / 100 })).sort((a, b) => b.total - a.total);
}

/** Wszystkie sumy dotyczą tej samej waluty i zakresu. BOOK to wykonanie; inne statusy są osobne. */
export function analyzeBankPeriod(rows: readonly BankTransaction[]) {
  const booked = rows.filter(isBankBooked);
  const sum = (kind: BankMovement, signed = false) => booked.filter(tx => bankMovement(tx) === kind)
    .reduce((s, tx) => s + Math.round((signed ? tx.amount : Math.abs(tx.amount)) * 100), 0) / 100;
  const income = sum('income');
  const expenses = sum('expense');
  const refunds = sum('refund');
  return {
    count: booked.length, pendingCount: rows.length - booked.length,
    income, expenses, refunds, result: Math.round((income - expenses + refunds) * 100) / 100,
    investments: sum('investment', true), cash: sum('cash', true), transfers: sum('transfer', true),
    reviewCount: booked.filter(tx => !tx.category || tx.category === 'do_sprawdzenia').length,
    spending: summarizeSpending(booked.filter(tx => bankMovement(tx) === 'expense')),
    sources: partyTotals(booked.filter(tx => bankMovement(tx) === 'income')),
    merchants: partyTotals(booked.filter(tx => bankMovement(tx) === 'expense')),
  };
}
