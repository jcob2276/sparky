import type { CorrelationResult } from '@vanguard/domain';

/** Zależności, w których po jednej stronie są wydatki (spend_*), a po drugiej sen, ruch, nastrój itp.; najsilniejsze pierwsze. */
export function selectFinanceInsights(correlations: readonly CorrelationResult[], limit = 3): CorrelationResult[] {
  const isSpend = (metric: string) => metric.startsWith('spend_');
  return correlations
    .filter(item => item.significant && item.has_enough_data && item.interpretation
      && (isSpend(item.x_metric) !== isSpend(item.y_metric)))
    .sort((a, b) => b.r_abs - a.r_abs)
    .slice(0, limit);
}
