import { describe, expect, it } from 'vitest';
import { detectPriceHikes, forecastBalance, type RecurringPayment } from '@vanguard/domain';

const rec = (over: Partial<RecurringPayment>): RecurringPayment => ({ key: 'k', name: 'Netflix', cadence: 'monthly', count: 4, typicalAmount: 50, lastAmount: 50, lastDate: '2026-11-01', nextExpected: '2026-12-01', monthlyCost: 50, ...over });

describe('balance forecast', () => {
  it('subtracts recurring payments on their expected day', () => {
    const f = forecastBalance(100, '2026-11-12', 30, [rec({})]);
    expect(f.points[0].balance).toBe(100);
    expect(f.points.at(-1)?.balance).toBe(50);
    expect(f.payments).toEqual([{ date: '2026-12-01', name: 'Netflix', amount: 50 }]);
    expect(f.firstNegative).toBeNull();
  });
  it('rolls overdue payments forward and flags a negative balance', () => {
    const f = forecastBalance(20, '2026-11-12', 30, [rec({ nextExpected: '2026-11-05' })]);
    expect(f.payments[0].date).toBe('2026-12-05');
    expect(f.firstNegative?.date).toBe('2026-12-05');
  });
  it('keeps monthly payments on the calendar anniversary across February', () => {
    const f = forecastBalance(500, '2026-01-31', 90, [rec({ nextExpected: '2026-01-31' })]);
    expect(f.payments.map(p => p.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });
  it('detects a price hike on the last charge', () => {
    expect(detectPriceHikes([rec({ lastAmount: 60 }), rec({ name: 'Stabilna' })])).toEqual([{ name: 'Netflix', from: 50, to: 60, pct: 0.2 }]);
  });
});
