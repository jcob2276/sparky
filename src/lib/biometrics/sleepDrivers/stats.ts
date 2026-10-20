import { spearman } from '@vanguard/domain';

/** Minimalna liczba par, od której raportujemy p-value (przybliżenie t jest poniżej bezużyteczne). */
const MIN_N_FOR_P = 8;

export interface RankCorrelation {
  n: number;
  rho: number;
  /** null gdy n < MIN_N_FOR_P */
  pValue: number | null;
}

/** Spearman z rangami średnimi dla remisów (domain). Null gdy za mało par lub brak zmienności. */
export function rankCorrelation(pairs: Array<[number, number]>): RankCorrelation | null {
  const core = spearman(pairs);
  if (!core) return null;
  return { n: core.n, rho: core.r, pValue: core.n >= MIN_N_FOR_P ? core.p : null };
}

export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function roundP(p: number | null): number | null {
  return p == null ? null : Math.round(p * 10000) / 10000;
}
