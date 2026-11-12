import { describe, expect, it } from 'vitest';
import { averageFlows, buildMonthlyFlows } from './monthlyFlows';

const tx = (transaction_date: string, kind: 'income' | 'expense', amount: number, flow_kind?: 'refund') => ({ transaction_date, kind, amount, flow_kind });

describe('buildMonthlyFlows', () => {
  it('returns the last months ending with the current one, oldest first', () => {
    expect(buildMonthlyFlows([], '2026-11-12', 3).map((flow) => flow.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(buildMonthlyFlows([], '2026-02-10', 3).map((flow) => flow.month)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('sums income and spending per month, ignoring refunds as income and anything after today', () => {
    const flows = buildMonthlyFlows([
      tx('2026-11-03', 'income', 5000), tx('2026-11-05', 'income', 40, 'refund'), tx('2026-11-06', 'expense', -300),
      tx('2026-11-20', 'expense', -999), tx('2026-10-15', 'expense', -100), tx('2026-10-16', 'income', 200),
    ], '2026-11-12', 2);
    expect(flows).toEqual([{ month: '2026-10', income: 200, expense: 100 }, { month: '2026-11', income: 5000, expense: 300 }]);
  });

  it('averages only the months that have data', () => {
    const flows = [{ month: 'a', income: 0, expense: 0 }, { month: 'b', income: 1000, expense: 400 }, { month: 'c', income: 3000, expense: 600 }];
    expect(averageFlows(flows)).toEqual({ income: 2000, expense: 500, months: 2 });
    expect(averageFlows([{ month: 'a', income: 0, expense: 0 }])).toEqual({ income: 0, expense: 0, months: 0 });
  });
});
