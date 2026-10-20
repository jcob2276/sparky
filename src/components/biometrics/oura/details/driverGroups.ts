import type {
  DriverCoverage, DriverEffect, DriverId, EffectDirection, EvidenceStrength,
} from '../../../../lib/biometrics/sleepDrivers/types';
import { DRIVER_ORDER, OUTCOME_ORDER } from './driverMeta';

export interface DriverGroup {
  driver: DriverId;
  effects: DriverEffect[];
  best: EvidenceStrength;
}

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
  confirmed: 3, probable: 2, tentative: 1, insufficient: 0,
};

/**
 * Grupuje efekty wg czynnika. Efekty `insufficient` NIE są wnioskami — trafiają tylko do
 * pokrycia danych. Karty: najpierw najpewniejsze, potem wg stałej kolejności czynników.
 */
export function groupEffectsByDriver(effects: DriverEffect[]): DriverGroup[] {
  const map = new Map<DriverId, DriverEffect[]>();
  for (const effect of effects) {
    if (effect.strength === 'insufficient') continue;
    map.set(effect.driver, [...(map.get(effect.driver) ?? []), effect]);
  }
  const groups: DriverGroup[] = [...map].map(([driver, list]) => {
    const sorted = [...list].sort((a, b) =>
      STRENGTH_RANK[b.strength] - STRENGTH_RANK[a.strength]
      || OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome));
    return { driver, effects: sorted, best: sorted[0].strength };
  });
  return groups.sort((a, b) =>
    STRENGTH_RANK[b.best] - STRENGTH_RANK[a.best]
    || DRIVER_ORDER.indexOf(a.driver) - DRIVER_ORDER.indexOf(b.driver));
}

/** Czynniki, dla których są dane, ale żaden efekt nie przekroczył progu wnioskowania. */
export function driversWithoutConclusions(effects: DriverEffect[], coverage: DriverCoverage[]): DriverId[] {
  const concluded = new Set(effects.filter((e) => e.strength !== 'insufficient').map((e) => e.driver));
  return coverage.map((c) => c.driver).filter((driver) => !concluded.has(driver));
}

/** Liczba z polskim przecinkiem i typograficznym minusem. */
export function formatNumber(value: number, digits = 1, signed = false): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(digits);
  const text = rounded.replace('.', ',').replace('-', '−');
  return signed && value > 0 ? `+${text}` : text;
}

/** Słowny opis siły związku z rho Spearmana. */
export function describeRho(rho: number | null): string {
  if (rho == null) return 'brak oceny siły związku';
  const abs = Math.abs(rho);
  const size = abs < 0.2 ? 'bardzo słaby' : abs < 0.4 ? 'słaby' : abs < 0.6 ? 'umiarkowany' : 'wyraźny';
  return `${size} związek (ρ = ${formatNumber(rho, 2)})`;
}

export const DIRECTION_LABEL: Record<EffectDirection, string> = {
  helps: 'Pomaga', hurts: 'Szkodzi', unclear: 'Niejasny kierunek',
};
