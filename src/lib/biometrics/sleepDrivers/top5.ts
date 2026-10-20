import { classifyEvidence, effectDirection, strengthRank } from './evidence';
import { top5Headline } from './headline';
import type { NightRecord, Top5Day } from './inputTypes';
import { compareGroups, type SplitSpec } from './split';
import { rankCorrelation, round, roundP } from './stats';
import type { SleepToTop5Effect, Top5PredictorId } from './types';

const TOP5_SPECS: Record<Top5PredictorId, SplitSpec> = {
  sleep_h: {
    fixedThreshold: 7,
    thresholdLabel: (t) => `Sen ${t} h`,
    lowLabel: (t) => `poniżej ${t} h`,
    highLabel: (t) => `${t} h lub więcej`,
  },
  sleep_score: {
    fixedThreshold: null,
    thresholdLabel: (t) => `Wynik snu ${t}`,
    lowLabel: (t) => `poniżej ${t} pkt`,
    highLabel: (t) => `${t} pkt lub więcej`,
  },
};

const PREDICTORS: Top5PredictorId[] = ['sleep_h', 'sleep_score'];

/** Wpływ snu nocy kończącej się w dniu D na odsetek wykonanych zadań Top 5 tego samego dnia. */
export function buildTop5Effects(nights: NightRecord[], days: Top5Day[]): SleepToTop5Effect[] {
  const doneByDate = new Map(days.map((d) => [d.date, d.donePct]));
  const out: SleepToTop5Effect[] = [];
  for (const predictor of PREDICTORS) {
    const pairs: Array<[number, number]> = [];
    for (const night of nights) {
      const x = night.outcomes[predictor];
      const y = doneByDate.get(night.date);
      if (x != null && y != null) pairs.push([x, y]);
    }
    const corr = rankCorrelation(pairs);
    const strength = classifyEvidence(pairs.length, corr?.rho ?? null, corr?.pValue ?? null);
    if (!corr || strength === 'insufficient') continue;
    const split = compareGroups(pairs, TOP5_SPECS[predictor], 0);
    out.push({
      predictor,
      n: corr.n,
      rho: round(corr.rho, 2),
      pValue: roundP(corr.pValue),
      strength,
      direction: effectDirection(corr.rho, true),
      split,
      headline: top5Headline(predictor, strength, corr.rho, split),
    });
  }
  return out.sort((a, b) => strengthRank(b.strength) - strengthRank(a.strength) || Math.abs(b.rho ?? 0) - Math.abs(a.rho ?? 0));
}
