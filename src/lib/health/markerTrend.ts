import type { MedicalLabRow } from './medicalAnalytics';

export type MarkerChange = { delta: number; pct: number | null; direction: 'up' | 'down' | 'flat' };

/** Wartości od najstarszej do najnowszej (historia serii jest posortowana malejąco). */
export function sparkValues(history: MedicalLabRow[], max = 8): number[] {
  return history
    .slice(0, max)
    .map((r) => Number(r.value))
    .filter((v) => Number.isFinite(v))
    .reverse();
}

export function markerChange(current: MedicalLabRow, previous: MedicalLabRow | null): MarkerChange | null {
  if (!previous) return null;
  const prev = Number(previous.value);
  const delta = Number(current.value) - prev;
  if (!Number.isFinite(delta)) return null;
  const pct = prev !== 0 ? Math.round((delta / Math.abs(prev)) * 1000) / 10 : null;
  return { delta, pct, direction: delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down' };
}

/** Wyniki z najnowszej daty badania — „co przyszło ostatnio”. */
export function latestBatchKeys(latestRows: MedicalLabRow[]): Set<string> {
  const newest = latestRows.reduce((max, r) => (r.result_date > max ? r.result_date : max), '');
  return new Set(latestRows.filter((r) => r.result_date === newest).map((r) => r.marker_key));
}
