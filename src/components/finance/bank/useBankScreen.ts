import { useState } from 'react';
import { detectRecurring } from '@vanguard/domain';
import type { BankData, BankTransaction } from '../../../lib/finance/bankApi';
import { analyzeBankPeriod, bankMovement, filterBankTransactions, isBankBooked, type BankFilters } from '../../../lib/finance/bankAnalytics';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';

export function useBankScreen(data: BankData | undefined) {
  const today = getTodayWarsaw();
  const [filters, setFilters] = useState<BankFilters>({ month: today.slice(0, 7), currency: 'PLN' });
  const [limit, setLimit] = useState(25);
  const [editing, setEditing] = useState<BankTransaction | null>(null);
  const accounts = data?.accounts ?? [];
  const rows = data?.transactions ?? [];
  const currencies = [...new Set([...accounts.map(a => a.currency || 'PLN'), ...rows.map(t => t.currency)])].sort();
  if (!currencies.length) currencies.push('PLN');
  const currency = currencies.includes(filters.currency) ? filters.currency : currencies[0];
  const effective = { ...filters, currency };
  const scope = { month: filters.month, currency, accountId: filters.accountId, today };
  const period = filterBankTransactions(rows, scope);
  const report = analyzeBankPeriod(period);
  const history = filterBankTransactions(rows, effective);
  const recurringRows = filterBankTransactions(rows, { currency, accountId: filters.accountId, today })
    .filter(tx => tx.booking_date && tx.booking_date >= shiftDateStr(today, -400) && isBankBooked(tx) && bankMovement(tx) === 'expense');
  const recurring = detectRecurring(recurringRows.flatMap(tx => tx.booking_date
    ? [{ counterparty: tx.counterparty_name, amount: tx.amount, date: tx.booking_date }] : []));
  const month = filters.month;
  const previousEnd = month ? shiftDateStr(`${month}-01`, -1) : '';
  const previousMonth = previousEnd.slice(0, 7);
  const compareTo = month === today.slice(0, 7) ? `${previousMonth}-${today.slice(8)}` : previousEnd;
  const comparable = accounts.filter(a => (!filters.accountId || a.id === filters.accountId) && a.currency === currency);
  const covered = !!month && comparable.length > 0 && comparable.every(a => a.transactions_from && a.transactions_from <= `${previousMonth}-01` && a.transactions_synced_at);
  const comparison = covered ? analyzeBankPeriod(filterBankTransactions(rows, { ...scope, month: previousMonth, today: compareTo < previousEnd ? compareTo : previousEnd })) : null;
  const update = (patch: Partial<BankFilters>) => {
    setFilters(current => ({ ...current, ...patch, ...(patch.accountId ? { currency: accounts.find(a => a.id === patch.accountId)?.currency || current.currency } : {}) }));
    setLimit(25);
  };
  return { filters: effective, update, accounts, currencies, report, history, recurring, comparison,
    limit, more: () => setLimit(n => n + 50), editing, edit: setEditing };
}
