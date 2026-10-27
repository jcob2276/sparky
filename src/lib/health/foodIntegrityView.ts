import type { Json } from '../database.types';

export type NutrientTrust = 'pewne' | 'czesciowe' | 'niepewne';

interface NutrientRow {
  key: string;
  label: string;
  knownKcalSharePct: number;
  /** Część kalorii z wartością ze źródła danych (reszta known to szacunek modelu). */
  certainKcalSharePct: number;
  trust: NutrientTrust;
}

export interface IntegrityView {
  estimatedSharePct: number | null;
  nutrients: NutrientRow[];
}

export interface IntegrityFindingRow {
  id: string;
  kind: string;
  severity: string;
  entityId: string | null;
  message: string;
  detail: { [key: string]: Json | undefined };
  autoFix: string | null;
}

const NUTRIENT_LABELS: Array<[string, string]> = [
  ['fiber', 'Błonnik'],
  ['saturated_fat', 'Nasycone'],
  ['sugar', 'Cukier'],
  ['salt', 'Sól'],
];
const SEVERITY_RANK: Record<string, number> = { high: 0, warn: 1, info: 2 };

export function jsonRecord(value: Json | null | undefined): { [key: string]: Json | undefined } {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isTrust(value: Json | undefined): value is NutrientTrust {
  return value === 'pewne' || value === 'czesciowe' || value === 'niepewne';
}

/** Czyta podsumowanie zapisane przez edge audytu; brakujące lub zniekształcone pola dają pusty widok, nie wyjątek. */
export function buildIntegrityView(summary: Json | null): IntegrityView {
  const root = jsonRecord(summary);
  const nutrients = jsonRecord(root.nutrients);
  const rows: NutrientRow[] = [];
  for (const [key, label] of NUTRIENT_LABELS) {
    const entry = jsonRecord(nutrients[key]);
    const share = entry.knownKcalSharePct;
    if (typeof share !== 'number' || !isTrust(entry.trust)) continue;
    const certain = typeof entry.certainKcalSharePct === 'number' ? entry.certainKcalSharePct : share;
    rows.push({ key, label, knownKcalSharePct: share, certainKcalSharePct: certain, trust: entry.trust });
  }
  const estimated = root.estimatedSharePct;
  return { estimatedSharePct: typeof estimated === 'number' ? estimated : null, nutrients: rows };
}

export function sortFindings(rows: IntegrityFindingRow[]): IntegrityFindingRow[] {
  return [...rows].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));
}

/** kcal z makro, jeśli znalezisko to niezgodność energii wpisu i wiadomo, na jaką wartość poprawić. */
export function energyFixCalories(row: IntegrityFindingRow): number | null {
  if (row.kind !== 'energy_mismatch' || !row.entityId) return null;
  const macroKcal = row.detail.macroKcal;
  return typeof macroKcal === 'number' && Number.isFinite(macroKcal) && macroKcal > 0 ? Math.round(macroKcal) : null;
}
