import { DRIVER_META, OUTCOME_META, TOP5_PREDICTOR_META } from './meta';
import { DRIVER_SPLITS } from './driverSplits';
import { isHigherBetter } from './evidence';
import { round } from './stats';
import type { DriverId, EvidenceStrength, SleepOutcomeId, SplitComparison, Top5PredictorId } from './types';

const TENTATIVE_NOTE = ' Wstępnie, za mało nocy.';

function signed(value: number): string {
  const abs = String(round(Math.abs(value), 2)).replace('.', ',');
  if (value === 0) return abs;
  return `${value > 0 ? '+' : '−'}${abs}`;
}

function suffix(strength: EvidenceStrength): string {
  return strength === 'tentative' ? TENTATIVE_NOTE : '';
}

/** Split „zgadza się” z rho, gdy różnica średnich ma ten sam znak co korelacja. */
function splitAgrees(split: SplitComparison | null, rho: number | null): split is SplitComparison {
  return split != null && rho != null && split.delta !== 0 && Math.sign(split.delta) === Math.sign(rho);
}

export function effectHeadline(
  driver: DriverId,
  outcome: SleepOutcomeId,
  strength: EvidenceStrength,
  rho: number | null,
  split: SplitComparison | null,
): string {
  const outcomeMeta = OUTCOME_META[outcome];
  if (splitAgrees(split, rho)) {
    const lowIsWorse = isHigherBetter(outcome) ? split.lowMean < split.highMean : split.lowMean > split.highMean;
    const label = lowIsWorse ? split.lowLabel : split.highLabel;
    const gap = lowIsWorse ? split.lowMean - split.highMean : split.highMean - split.lowMean;
    return `${DRIVER_SPLITS[driver].subject} ${label}: ${outcomeMeta.label} ${signed(gap)} ${outcomeMeta.unit}.${suffix(strength)}`;
  }
  const rises = (rho ?? 0) > 0;
  return `${DRIVER_META[driver].label}, wyższa wartość: ${outcomeMeta.label} ${rises ? 'rośnie' : 'spada'}.${suffix(strength)}`;
}

export function top5Headline(
  predictor: Top5PredictorId,
  strength: EvidenceStrength,
  rho: number | null,
  split: SplitComparison | null,
): string {
  const meta = TOP5_PREDICTOR_META[predictor];
  if (splitAgrees(split, rho)) {
    const when = predictor === 'sleep_h' ? `Po śnie ${split.lowLabel}` : `Po nocy z wynikiem ${split.lowLabel}`;
    const more = split.delta > 0;
    return `${when} robisz o ${String(round(Math.abs(split.delta), 0))} pp ${more ? 'mniej' : 'więcej'} z Top 5.${suffix(strength)}`;
  }
  return `Top 5: ${meta.label} ${(rho ?? 0) > 0 ? 'idzie w parze z wyższym' : 'idzie w parze z niższym'} odsetkiem wykonanych zadań.${suffix(strength)}`;
}
