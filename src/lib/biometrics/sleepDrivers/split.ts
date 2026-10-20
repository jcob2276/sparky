import type { SplitComparison } from './types';
import { mean, median, round } from './stats';

const MIN_GROUP_SIZE = 3;

export interface SplitLabels {
  thresholdLabel: (threshold: number) => string;
  lowLabel: (threshold: number) => string;
  highLabel: (threshold: number) => string;
}

export interface SplitSpec extends SplitLabels {
  /** Stały próg; null = mediana predyktora. Gdy stały próg zostawia małą grupę, spada do mediany. */
  fixedThreshold: number | null;
}

function partition(pairs: Array<[number, number]>, threshold: number) {
  const low = pairs.filter(([x]) => x < threshold).map(([, y]) => y);
  const high = pairs.filter(([x]) => x >= threshold).map(([, y]) => y);
  return { low, high };
}

/** Porównanie grup niski/wysoki predyktor. Zwraca null, gdy któraś grupa ma < MIN_GROUP_SIZE nocy. */
export function compareGroups(
  pairs: Array<[number, number]>,
  spec: SplitSpec,
  outcomeDigits = 1,
): SplitComparison | null {
  if (pairs.length < MIN_GROUP_SIZE * 2) return null;
  let threshold = spec.fixedThreshold ?? median(pairs.map(([x]) => x));
  let groups = partition(pairs, threshold);
  if (spec.fixedThreshold != null && (groups.low.length < MIN_GROUP_SIZE || groups.high.length < MIN_GROUP_SIZE)) {
    threshold = median(pairs.map(([x]) => x));
    groups = partition(pairs, threshold);
  }
  if (groups.low.length < MIN_GROUP_SIZE || groups.high.length < MIN_GROUP_SIZE) return null;
  const threshold1 = round(threshold, 1);
  const lowMean = round(mean(groups.low), outcomeDigits);
  const highMean = round(mean(groups.high), outcomeDigits);
  return {
    thresholdLabel: spec.thresholdLabel(threshold1),
    lowLabel: spec.lowLabel(threshold1),
    highLabel: spec.highLabel(threshold1),
    lowN: groups.low.length,
    highN: groups.high.length,
    lowMean,
    highMean,
    delta: round(highMean - lowMean, outcomeDigits),
  };
}
