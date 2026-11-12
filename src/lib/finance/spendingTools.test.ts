import { expect, it } from 'vitest';
import { compareSpending, simulatePurchase } from './spendingTools';
it('compares equal month-to-date windows and excludes future expenses', () => {
  expect(compareSpending([
    { transaction_date: '2026-10-10', kind: 'expense', amount: 100 },
    { transaction_date: '2026-10-20', kind: 'expense', amount: 900 },
    { transaction_date: '2026-11-10', kind: 'expense', amount: 150 },
    { transaction_date: '2026-11-20', kind: 'expense', amount: 900 },
  ], '2026-11-12')).toEqual({ current: 150, previous: 100, difference: 50, percent: 50 });
});
it('shows overspend rather than a negative daily allowance', () => {
  expect(simulatePurchase(1000, 800, 300, 10)).toEqual({ remaining: -100, daily: 0, overBudget: true });
});
