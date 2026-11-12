import { describe, expect, it } from 'vitest';
import { computeFinanceAlerts } from '@vanguard/domain';

const tx = (date: string, amount: number, name: string, category: string | null = 'zakupy') =>
  ({ amount, currency: 'PLN', booking_date: date, counterparty_name: name, category });
const base = { today: '2026-11-12', accounts: [{ currency: 'PLN', balance: 1000 }], transactions: [tx('2026-11-03', -300, 'Sklep')], budgets: {} };
const netflix = ['2026-08-20', '2026-09-20', '2026-10-20'].map(d => tx(d, -50, 'Netflix', 'subskrypcje'));

describe('computeFinanceAlerts', () => {
  it('flags overrun and near-limit envelopes, most severe first', () => {
    const over = computeFinanceAlerts({ ...base, budgets: { zakupy: 200 }, transactions: [...base.transactions, tx('2026-11-04', -5, 'X', null)] });
    expect(over.map(a => a.tone)).toEqual(['danger', 'info']);
    expect(computeFinanceAlerts({ ...base, budgets: { zakupy: 350 } })[0].tone).toBe('warning');
  });
  it('warns about a negative forecast and a price hike on the last charge', () => {
    const rows = [...netflix.slice(0, 2), tx('2026-10-20', -60, 'Netflix', 'subskrypcje')];
    const alerts = computeFinanceAlerts({ ...base, accounts: [{ currency: 'PLN', balance: 20 }], transactions: rows });
    expect(alerts.map(a => a.id)).toEqual(['negative', 'hike-Netflix']);
  });
  it('ignores future transactions in budgets and categorization alerts', () => {
    expect(computeFinanceAlerts({ ...base, transactions: [tx('2026-11-20', -500, 'Sklep', null)], budgets: { do_sprawdzenia: 100 } })).toEqual([]);
  });
  it('ignores pending transactions and is empty when nothing needs attention', () => {
    expect(computeFinanceAlerts({ ...base, budgets: { zakupy: 200 }, transactions: [{ ...tx('2026-11-03', -300, 'Sklep'), status: 'PDNG' }] })).toEqual([]);
  });
});
