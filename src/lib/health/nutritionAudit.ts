import type { FoodTrustLevel } from './foodTrust';

interface AuditableEntry {
  calories?: number | null;
  parse_meta?: unknown;
}

export interface NutritionDayAudit {
  score: number;
  label: string;
  uncertainEntries: number;
  incompleteEntries: number;
}

export interface DayEnergyRange {
  total: number;
  min: number;
  max: number;
  /** Jaka część kalorii dnia pochodzi z szacunku (niepewność ≥ 20%). */
  estimatedSharePct: number;
}

/** Niepewność wpisów sprzed zapisu `uncertainty_pct`, wg poziomu zaufania. */
const FALLBACK_UNCERTAINTY_PCT: Record<string, number> = { confirmed: 8, reference: 12, estimated: 25 };
const DEFAULT_UNCERTAINTY_PCT = 15;
const ESTIMATE_THRESHOLD_PCT = 20;

function entryUncertaintyPct(parseMeta: unknown): number {
  const meta = parseMeta && typeof parseMeta === 'object' ? parseMeta as Record<string, unknown> : {};
  if (typeof meta.uncertainty_pct === 'number' && Number.isFinite(meta.uncertainty_pct)) return meta.uncertainty_pct;
  return typeof meta.trust_level === 'string'
    ? FALLBACK_UNCERTAINTY_PCT[meta.trust_level] ?? DEFAULT_UNCERTAINTY_PCT
    : DEFAULT_UNCERTAINTY_PCT;
}

/** Możliwy zakres kcal dnia: błędy szacunków się nie znoszą (LLM myli się systematycznie), więc rozstępy sumujemy. */
export function computeDayEnergyRange(entries: AuditableEntry[]): DayEnergyRange | null {
  let total = 0;
  let spread = 0;
  let estimated = 0;
  for (const entry of entries) {
    const calories = entry.calories ?? 0;
    if (calories <= 0) continue;
    const pct = entryUncertaintyPct(entry.parse_meta);
    total += calories;
    spread += calories * pct / 100;
    if (pct >= ESTIMATE_THRESHOLD_PCT) estimated += calories;
  }
  if (total <= 0) return null;
  return {
    total: Math.round(total),
    min: Math.max(0, Math.round(total - spread)),
    max: Math.round(total + spread),
    estimatedSharePct: Math.round((estimated / total) * 100),
  };
}

export function auditNutritionDay(entries: AuditableEntry[]): NutritionDayAudit {
  if (!entries.length) return { score: 0, label: 'Brak wpisów', uncertainEntries: 0, incompleteEntries: 0 };
  let uncertainEntries = 0;
  let incompleteEntries = 0;
  let penalty = 0;
  for (const entry of entries) {
    const meta = entry.parse_meta && typeof entry.parse_meta === 'object'
      ? entry.parse_meta as Record<string, unknown> : {};
    const level = meta.trust_level as FoodTrustLevel | undefined;
    if (entry.calories == null || entry.calories <= 0 || level === 'incomplete') {
      incompleteEntries += 1;
      penalty += 35;
    } else if (level === 'estimated' || !level) {
      uncertainEntries += 1;
      penalty += 16;
    } else if (level === 'reference') {
      uncertainEntries += 1;
      penalty += 6;
    }
  }
  const score = Math.max(0, Math.round(100 - penalty / entries.length));
  const label = score >= 90 ? 'Dane bardzo pewne' : score >= 70 ? 'Dane wystarczające' : 'Warto sprawdzić';
  return { score, label, uncertainEntries, incompleteEntries };
}

