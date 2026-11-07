import { describe, expect, it } from 'vitest';
import { analyzeBankPeriod, filterBankTransactions } from './bankAnalytics';
import type { BankTransaction } from './bankApi';

const tx = (id: string, amount: number, category: string, patch: Partial<BankTransaction> = {}): BankTransaction => ({
  id, account_id: 'a', amount, currency: 'PLN', booking_date: '2026-11-03',
  counterparty_name: 'Sklep', remittance: null, category, status: 'BOOK', ...patch,
});

describe('bank period accounting', () => {
  it('separates income, refunds, consumption, investments, cash and own transfers', () => {
    const report = analyzeBankPeriod([
      tx('1', 2000, 'wynagrodzenie'), tx('2', -150, 'zakupy'), tx('3', 20, 'zwrot'),
      tx('4', -500, 'przelewy_wlasne'), tx('5', -300, 'inwestycje'), tx('6', -100, 'gotowka'),
      tx('7', -25, 'do_sprawdzenia'), tx('8', -99, 'zakupy', { status: 'PDNG' }),
    ]);
    expect(report).toMatchObject({ income: 2000, expenses: 175, refunds: 20, result: 1845, investments: -300, cash: -100, transfers: -500, pendingCount: 1, reviewCount: 1 });
    expect(report.spending.reduce((s, r) => s + r.total, 0)).toBe(175);
  });

  it('filters one month, account and currency and never includes future/undated rows', () => {
    const rows = [tx('ok', -10, 'zakupy'), tx('future', -20, 'zakupy', { booking_date: '2026-11-30' }),
      tx('old', -30, 'zakupy', { booking_date: '2026-10-31' }), tx('eur', -40, 'zakupy', { currency: 'EUR' }),
      tx('other', -50, 'zakupy', { account_id: 'b' }), tx('unknown', -60, 'zakupy', { booking_date: null })];
    expect(filterBankTransactions(rows, { month: '2026-11', accountId: 'a', currency: 'PLN', today: '2026-11-07' }).map(t => t.id)).toEqual(['ok']);
  });

  it('searches accents and applies category and direction to the same list', () => {
    const rows = [tx('1', -20, 'zakupy', { counterparty_name: 'Żółty sklep' }), tx('2', 40, 'wplyw', { remittance: 'Żółty sklep' })];
    expect(filterBankTransactions(rows, { currency: 'PLN', search: 'zolty', direction: 'debit', category: 'zakupy' }).map(t => t.id)).toEqual(['1']);
  });

  it('groups actual income by sender and does not merge it with refunds or own transfers', () => {
    const report = analyzeBankPeriod([tx('1', 100, 'wplyw'), tx('2', 200, 'dzialalnosc'), tx('3', 50, 'zwrot'), tx('4', 500, 'przelewy_wlasne')]);
    expect(report.sources).toEqual([expect.objectContaining({ name: 'Sklep', total: 300, count: 2 })]);
    expect(analyzeBankPeriod([])).toMatchObject({ income: 0, expenses: 0, sources: [], spending: [] });
  });
});
