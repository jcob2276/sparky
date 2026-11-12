import { describe, expect, it } from 'vitest';
import type { CorrelationResult } from '@vanguard/domain';
import { selectFinanceInsights } from './financeInsights';

const item = (over: Partial<CorrelationResult>): CorrelationResult => ({
  id: 'a', category: 'sleep', label: 'L', note: '', x_metric: 'spend_total', y_metric: 'sleep_score', x_label: '', y_label: '',
  lag_days: 0, r: 0.4, r_pearson: 0.4, r_spearman: 0.4, r_abs: 0.4, n: 40, p: 0.01, significant: true, confidence: 'high',
  has_enough_data: true, slope: 1, intercept: 0, interpretation: 'Tekst', scatter: [], ...over,
} as CorrelationResult);

describe('selectFinanceInsights', () => {
  it('keeps only significant spending-versus-life pairs, strongest first', () => {
    const out = selectFinanceInsights([
      item({ id: 'weak', r_abs: 0.2 }), item({ id: 'strong', r_abs: 0.6 }),
      item({ id: 'no-spend', x_metric: 'steps', y_metric: 'sleep_score', r_abs: 0.9 }),
      item({ id: 'spend-spend', x_metric: 'spend_total', y_metric: 'spend_food', r_abs: 0.95 }),
      item({ id: 'insignificant', significant: false, r_abs: 0.8 }),
    ]);
    expect(out.map(i => i.id)).toEqual(['strong', 'weak']);
  });
});
