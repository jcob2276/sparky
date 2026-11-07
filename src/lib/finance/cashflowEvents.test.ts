import { expect, it } from 'vitest';
import { buildFinanceCashflowMonth } from './cashflowEvents';

it('projects future plans from current balance without subtracting imported execution again', () => {
  const bundle = {
    bills: [{ id: 'past', user_id: 'u', name: 'Past', amount: 90, due_day: 5, reminder_days: 0, is_active: true, created_at: '' },
      { id: 'next', user_id: 'u', name: 'Next', amount: 50, due_day: 20, reminder_days: 0, is_active: true, created_at: '' }],
    subscriptions: [], incomeSources: [{ id: 'i', user_id: 'u', name: 'Salary', amount_monthly: 100, source_type: 'salary', is_active: true, created_at: '' }],
    transactions: [{ id: 't', user_id: 'u', amount: -20, category: 'Zakupy', note: null, kind: 'expense' as const, transaction_date: '2026-11-01', created_at: '' }],
  };
  const result = buildFinanceCashflowMonth(bundle, '2026-11', 100, '2026-11-07');
  expect(result.projectedEndBalance).toBe(150);
  expect(result.totalOut).toBe(50);
});
