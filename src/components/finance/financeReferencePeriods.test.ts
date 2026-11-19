import { describe, expect, it } from 'vitest';
import { financePeriodBounds, financeRecordsInRange } from './financeReferencePeriods';
import type { FinanceTransaction } from '../../lib/financeApi';

describe('finance date range boundaries', () => {
  it('handles leap February and month rollover after December', () => {
    expect(financePeriodBounds('2024-03-01', 'month', 1)).toEqual(['2024-02-01', '2024-02-29']);
    expect(financePeriodBounds('2026-01-01', 'month', 1)).toEqual(['2025-12-01', '2025-12-31']);
  });

  it('uses Monday to Sunday across the end of the year', () => {
    expect(financePeriodBounds('2026-01-01', 'week', 0)).toEqual(['2025-12-29', '2026-01-04']);
  });

  it('includes both boundaries and excludes both adjacent dates', () => {
    const tx = (date: string): FinanceTransaction => ({
      id: date, user_id: 'u', kind: 'expense', amount: 1, category: 'Jedzenie', note: null,
      transaction_date: date, created_at: '',
    });
    const result = financeRecordsInRange(['2025-12-28', '2025-12-29', '2026-01-04', '2026-01-05'].map(tx),
      { from: '2025-12-29', to: '2026-01-04' });
    expect(result.map((item) => item.id)).toEqual(['2025-12-29', '2026-01-04']);
  });
});
