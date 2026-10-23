import { pearson } from './correlations/math.ts';
import type { DeviceSignalsDailyRow, OuraNightRow } from './deviceSignalsDaily.ts';

export const MIN_CORRELATION_NIGHTS = 14;

export type PhoneSleepMetricKey = 'screenAfter22' | 'eveningLux' | 'eveningBrightness';
export type OuraOutcomeKey = 'sleepScore' | 'sleepHours';

export interface PhoneSleepCorrelation {
  metric: PhoneSleepMetricKey;
  outcome: OuraOutcomeKey;
  n: number;
  r: number;
  p: number;
  /** Sharp thresholds on purpose: we run several tests, so most results stay "no clear link". */
  verdict: 'clear' | 'hint' | 'none';
}

export interface PhoneSleepInsights {
  status: 'ready' | 'insufficient';
  /** Largest number of nights with both a phone value and an Oura value. */
  nights: number;
  needed: number;
  correlations: PhoneSleepCorrelation[];
}

const METRICS: Array<{ key: PhoneSleepMetricKey; pick: (r: DeviceSignalsDailyRow) => number | null }> = [
  { key: 'screenAfter22', pick: (r) => (r.eventCount > 0 ? r.screenAfter22Min : null) },
  { key: 'eveningLux', pick: (r) => r.eveningLuxAvg },
  { key: 'eveningBrightness', pick: (r) => r.eveningBrightnessAvg },
];
const OUTCOMES: Array<{ key: OuraOutcomeKey; pick: (o: OuraNightRow) => number | null }> = [
  { key: 'sleepScore', pick: (o) => o.sleepScore },
  { key: 'sleepHours', pick: (o) => o.totalSleepHours },
];

function verdictFor(p: number, r: number): PhoneSleepCorrelation['verdict'] {
  if (p < 0.01 && Math.abs(r) >= 0.4) return 'clear';
  if (p < 0.05 && Math.abs(r) >= 0.3) return 'hint';
  return 'none';
}

/** Evening screen / light on the phone vs. the same night's Oura result. Shows n, never fakes a result. */
export function computePhoneSleepInsights(daily: DeviceSignalsDailyRow[], oura: OuraNightRow[]): PhoneSleepInsights {
  const ouraByDate = new Map(oura.map((o) => [o.date, o]));
  const correlations: PhoneSleepCorrelation[] = [];
  let maxN = 0;
  for (const m of METRICS) {
    for (const o of OUTCOMES) {
      const pairs: Array<[number, number]> = [];
      for (const row of daily) {
        const night = ouraByDate.get(row.date);
        const x = m.pick(row);
        const y = night ? o.pick(night) : null;
        if (x !== null && y !== null) pairs.push([x, y]);
      }
      maxN = Math.max(maxN, pairs.length);
      if (pairs.length < MIN_CORRELATION_NIGHTS) continue;
      const core = pearson(pairs);
      if (core === null) continue;
      correlations.push({
        metric: m.key,
        outcome: o.key,
        n: core.n,
        r: core.r,
        p: core.p,
        verdict: verdictFor(core.p, core.r),
      });
    }
  }
  return {
    status: correlations.length > 0 ? 'ready' : 'insufficient',
    nights: maxN,
    needed: MIN_CORRELATION_NIGHTS,
    correlations: correlations.sort((a, b) => a.p - b.p),
  };
}
