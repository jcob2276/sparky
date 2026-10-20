import { DRIVER_IDS, OUTCOME_IDS } from './meta';
import { DRIVER_SPLITS } from './driverSplits';
import { classifyEvidence, effectDirection, isHigherBetter, strengthRank } from './evidence';
import { effectHeadline } from './headline';
import { compareGroups } from './split';
import { rankCorrelation, round, roundP } from './stats';
import type { NightRecord } from './inputTypes';
import type { DriverEffect, DriverId, SleepOutcomeId } from './types';

const MAX_EFFECTS = 16;
/** Wyniki o skali ułamkowej (godziny) pokazujemy z 2 miejscami, reszta z 1. */
const OUTCOME_DIGITS: Record<SleepOutcomeId, number> = {
  sleep_score: 1,
  sleep_h: 2,
  sleep_efficiency: 1,
  deep_sleep_pct: 1,
  sleep_hrv: 1,
  sleep_latency_min: 1,
};

function pairsFor(nights: NightRecord[], driver: DriverId, outcome: SleepOutcomeId): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (const night of nights) {
    const x = night.drivers[driver];
    const y = night.outcomes[outcome];
    if (x != null && y != null) pairs.push([x, y]);
  }
  return pairs;
}

function buildEffect(driver: DriverId, outcome: SleepOutcomeId, pairs: Array<[number, number]>): DriverEffect | null {
  const corr = rankCorrelation(pairs);
  const strength = classifyEvidence(pairs.length, corr?.rho ?? null, corr?.pValue ?? null);
  if (!corr || strength === 'insufficient') return null;
  const split = compareGroups(pairs, DRIVER_SPLITS[driver].spec, OUTCOME_DIGITS[outcome]);
  return {
    id: `${driver}:${outcome}`,
    driver,
    outcome,
    n: corr.n,
    rho: round(corr.rho, 2),
    pValue: roundP(corr.pValue),
    strength,
    direction: effectDirection(corr.rho, isHigherBetter(outcome)),
    split,
    headline: effectHeadline(driver, outcome, strength, corr.rho, split),
  };
}

/** Efekty (driver × wynik) posortowane: siła dowodu, potem |rho|; „insufficient” odpada. */
export function buildDriverEffects(nights: NightRecord[]): DriverEffect[] {
  const effects: DriverEffect[] = [];
  for (const driver of DRIVER_IDS) {
    for (const outcome of OUTCOME_IDS) {
      const effect = buildEffect(driver, outcome, pairsFor(nights, driver, outcome));
      if (effect) effects.push(effect);
    }
  }
  return effects
    .sort((a, b) => strengthRank(b.strength) - strengthRank(a.strength) || Math.abs(b.rho ?? 0) - Math.abs(a.rho ?? 0))
    .slice(0, MAX_EFFECTS);
}
