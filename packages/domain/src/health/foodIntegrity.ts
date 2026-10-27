import { assessEnergyConsistency, describeEnergyMismatch, type EnergyMismatchReason } from './foodEnergy.ts';

/** Wpis z `daily_food_entries` w formie potrzebnej do audytu. */
export interface AuditEntry {
  id: string;
  date: string;
  name: string;
  amount: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  saturated_fat: number | null;
  salt: number | null;
  meal_type: string | null;
  meal_group_id: string | null;
  logged_at: string | null;
  parse_meta: unknown;
}

/** Ulubiony produkt: wartości per 100 g. */
export interface AuditFavorite {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface AuditPhoto { id: string; meal_group_id: string; date?: string }
export interface AuditDayTotals { date: string; calories: number | null }

export type IntegrityFindingKind =
  | 'energy_mismatch'
  | 'placeholder_favorite'
  | 'duplicate_entry'
  | 'orphan_photo'
  | 'totals_drift'
  | 'micronutrient_gap'
  | 'provenance_gap'
  | 'estimate_share_high';

export type IntegritySeverity = 'info' | 'warn' | 'high';
export type IntegrityAutoFix = 'quarantine_favorite' | 'recompute_totals';

export interface IntegrityFinding {
  kind: IntegrityFindingKind;
  severity: IntegritySeverity;
  entityTable: 'daily_food_entries' | 'food_favorites' | 'nutrition_meal_photos' | 'daily_nutrition' | null;
  entityId: string | null;
  /** Stabilny klucz: ten sam problem to ten sam wiersz po kolejnym uruchomieniu. */
  fingerprint: string;
  message: string;
  detail: Record<string, unknown>;
  /** Naprawa odwracalna, którą może wykonać serwer sam; wartości wpisów nigdy nie są zmieniane po cichu. */
  autoFix: IntegrityAutoFix | null;
}

export type MicronutrientKey = 'fiber' | 'sugar' | 'saturated_fat' | 'salt';
export type MicronutrientTrust = 'pewne' | 'czesciowe' | 'niepewne';

export interface MicronutrientConfidence {
  /** Jaka część kalorii okresu pochodzi z wpisów, które mają tę wartość (0 się liczy). */
  knownKcalSharePct: number;
  trust: MicronutrientTrust;
  /** Największe wpisy bez wartości: od nich warto zacząć uzupełnianie. */
  topMissing: Array<{ id: string; name: string; calories: number }>;
}

export interface FoodIntegritySummary {
  entries: number;
  kcal: number;
  estimatedSharePct: number;
  provenanceMissingSharePct: number;
  nutrients: Record<MicronutrientKey, MicronutrientConfidence>;
}

export interface FoodIntegrityInput {
  entries: AuditEntry[];
  favorites: AuditFavorite[];
  photos: AuditPhoto[];
  dayTotals: AuditDayTotals[];
}

export interface FoodIntegrityResult {
  findings: IntegrityFinding[];
  summary: FoodIntegritySummary;
}

const NUTRIENT_LABEL: Record<MicronutrientKey, string> = {
  fiber: 'Błonnik',
  sugar: 'Cukier',
  saturated_fat: 'Tłuszcz nasycony',
  salt: 'Sól',
};
const NUTRIENTS = Object.keys(NUTRIENT_LABEL) as MicronutrientKey[];

const TRUSTED_SHARE_PCT = 90;
const PARTIAL_SHARE_PCT = 60;
const ESTIMATE_THRESHOLD_PCT = 20;
const HIGH_ESTIMATE_SHARE_PCT = 40;
const HIGH_PROVENANCE_GAP_PCT = 25;
const DUPLICATE_WINDOW_MS = 120_000;
const TOTALS_DRIFT_KCAL = 5;
const TOP_MISSING = 5;

/** Niepewność wpisów sprzed zapisu `uncertainty_pct`, wg poziomu zaufania. */
const FALLBACK_UNCERTAINTY_PCT: Record<string, number> = { confirmed: 8, reference: 12, estimated: 25 };
const DEFAULT_UNCERTAINTY_PCT = 15;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function entryUncertaintyPct(parseMeta: unknown): number {
  const meta = asRecord(parseMeta);
  if (typeof meta.uncertainty_pct === 'number' && Number.isFinite(meta.uncertainty_pct)) return meta.uncertainty_pct;
  return typeof meta.trust_level === 'string'
    ? FALLBACK_UNCERTAINTY_PCT[meta.trust_level] ?? DEFAULT_UNCERTAINTY_PCT
    : DEFAULT_UNCERTAINTY_PCT;
}

const AMOUNT_WITH_UNIT = /^\s*(\d+(?:[.,]\d+)?)\s*(g|gr|ml|kg|l)\b/i;

/** Tylko jawna masa lub objętość (ml ≈ g); „3 szt.” i gołe liczby nie są gramami, więc nie wolno ich porównywać z makro. */
export function parseAmountGrams(amount: string | null): number | null {
  const match = amount?.match(AMOUNT_WITH_UNIT);
  if (!match) return null;
  const value = parseFloat(match[1].replace(',', '.'));
  const unit = match[2].toLowerCase();
  const grams = unit === 'kg' || unit === 'l' ? value * 1000 : value;
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const kcalOf = (entry: AuditEntry) => Math.max(0, entry.calories ?? 0);

function trustFor(sharePct: number): MicronutrientTrust {
  if (sharePct >= TRUSTED_SHARE_PCT) return 'pewne';
  return sharePct >= PARTIAL_SHARE_PCT ? 'czesciowe' : 'niepewne';
}

function micronutrientConfidence(entries: AuditEntry[], key: MicronutrientKey): MicronutrientConfidence {
  let total = 0;
  let known = 0;
  const missing: MicronutrientConfidence['topMissing'] = [];
  for (const entry of entries) {
    const kcal = kcalOf(entry);
    if (kcal <= 0) continue;
    total += kcal;
    if (entry[key] != null) known += kcal;
    else missing.push({ id: entry.id, name: entry.name, calories: kcal });
  }
  const knownKcalSharePct = total > 0 ? pct(known, total) : 100;
  return {
    knownKcalSharePct,
    trust: trustFor(knownKcalSharePct),
    topMissing: missing.sort((a, b) => b.calories - a.calories).slice(0, TOP_MISSING),
  };
}

function energyFindings(entries: AuditEntry[]): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  for (const entry of entries) {
    const grams = parseAmountGrams(entry.amount);
    if (grams == null) continue;
    const check = assessEnergyConsistency(entry, grams);
    if (check.status !== 'mismatch') continue;
    findings.push({
      kind: 'energy_mismatch',
      severity: check.reason === 'kcal_zero_with_macros' ? 'high' : 'warn',
      entityTable: 'daily_food_entries',
      entityId: entry.id,
      fingerprint: `energy_mismatch:${entry.id}`,
      message: `${entry.name} (${entry.date}): ${describeEnergyMismatch(check, entry.calories ?? 0)}`,
      detail: { date: entry.date, reason: check.reason as EnergyMismatchReason, loggedCalories: entry.calories, macroKcal: check.macroKcal, grams },
      autoFix: null,
    });
  }
  return findings;
}

function favoriteFindings(favorites: AuditFavorite[]): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  for (const favorite of favorites) {
    const check = assessEnergyConsistency(favorite);
    if (check.status !== 'mismatch') continue;
    findings.push({
      kind: 'placeholder_favorite',
      severity: 'high',
      entityTable: 'food_favorites',
      entityId: favorite.id,
      fingerprint: `placeholder_favorite:${favorite.id}`,
      message: `Ulubiony „${favorite.name}” ma błędne kcal na 100 g: ${describeEnergyMismatch(check, favorite.calories ?? 0)}`,
      detail: { reason: check.reason, storedCalories: favorite.calories, macroKcal: check.macroKcal },
      autoFix: 'quarantine_favorite',
    });
  }
  return findings;
}

function duplicateFindings(entries: AuditEntry[]): IntegrityFinding[] {
  const groups = new Map<string, AuditEntry[]>();
  for (const entry of entries) {
    if (!entry.logged_at) continue;
    const key = [entry.date, entry.meal_type ?? '', entry.name.trim().toLowerCase(), entry.amount ?? '', entry.calories ?? ''].join('|');
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const findings: IntegrityFinding[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => Date.parse(a.logged_at!) - Date.parse(b.logged_at!));
    for (let i = 1; i < sorted.length; i += 1) {
      const gapMs = Date.parse(sorted[i].logged_at!) - Date.parse(sorted[i - 1].logged_at!);
      if (gapMs > DUPLICATE_WINDOW_MS) continue;
      findings.push({
        kind: 'duplicate_entry',
        severity: 'warn',
        entityTable: 'daily_food_entries',
        entityId: sorted[i].id,
        fingerprint: `duplicate_entry:${sorted[i].id}`,
        message: `${sorted[i].name} (${sorted[i].date}) zapisane dwa razy w ciągu ${Math.round(gapMs / 1000)} s`,
        detail: { date: sorted[i].date, duplicateOf: sorted[i - 1].id, gapSeconds: Math.round(gapMs / 1000) },
        autoFix: null,
      });
    }
  }
  return findings;
}

function orphanPhotoFindings(entries: AuditEntry[], photos: AuditPhoto[]): IntegrityFinding[] {
  const groups = new Set(entries.map((entry) => entry.meal_group_id).filter((id): id is string => id != null));
  return photos
    .filter((photo) => !groups.has(photo.meal_group_id))
    .map((photo) => ({
      kind: 'orphan_photo' as const,
      severity: 'info' as const,
      entityTable: 'nutrition_meal_photos' as const,
      entityId: photo.id,
      fingerprint: `orphan_photo:${photo.id}`,
      message: 'Zdjęcie posiłku bez zapisanych pozycji: dodaj posiłek albo usuń zdjęcie',
      detail: { date: photo.date, mealGroupId: photo.meal_group_id },
      autoFix: null,
    }));
}

function driftFindings(entries: AuditEntry[], dayTotals: AuditDayTotals[]): IntegrityFinding[] {
  const byDate = new Map<string, number>();
  for (const entry of entries) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + kcalOf(entry));
  const findings: IntegrityFinding[] = [];
  for (const [date, sum] of byDate) {
    const stored = dayTotals.find((row) => row.date === date)?.calories ?? null;
    if (stored != null && Math.abs(stored - sum) <= TOTALS_DRIFT_KCAL) continue;
    findings.push({
      kind: 'totals_drift',
      severity: 'warn',
      entityTable: 'daily_nutrition',
      entityId: date,
      fingerprint: `totals_drift:${date}`,
      message: `Suma dnia ${date} (${stored ?? 'brak'} kcal) nie zgadza się z wpisami (${Math.round(sum)} kcal)`,
      detail: { date, storedCalories: stored, entriesCalories: Math.round(sum) },
      autoFix: 'recompute_totals',
    });
  }
  return findings;
}

function gapFinding(
  kind: 'micronutrient_gap' | 'provenance_gap' | 'estimate_share_high',
  fingerprint: string,
  severity: IntegritySeverity,
  message: string,
  detail: Record<string, unknown>,
): IntegrityFinding {
  return { kind, severity, entityTable: null, entityId: null, fingerprint, message, detail, autoFix: null };
}

export function auditFoodData(input: FoodIntegrityInput): FoodIntegrityResult {
  const { entries } = input;
  const kcal = entries.reduce((sum, entry) => sum + kcalOf(entry), 0);
  const estimatedKcal = entries.reduce(
    (sum, entry) => sum + (entryUncertaintyPct(entry.parse_meta) >= ESTIMATE_THRESHOLD_PCT ? kcalOf(entry) : 0), 0);
  const noProvenanceKcal = entries.reduce(
    (sum, entry) => sum + (asRecord(entry.parse_meta).macroSource == null ? kcalOf(entry) : 0), 0);

  const nutrients = Object.fromEntries(
    NUTRIENTS.map((key) => [key, micronutrientConfidence(entries, key)]),
  ) as Record<MicronutrientKey, MicronutrientConfidence>;

  const summary: FoodIntegritySummary = {
    entries: entries.length,
    kcal: Math.round(kcal),
    estimatedSharePct: pct(estimatedKcal, kcal),
    provenanceMissingSharePct: pct(noProvenanceKcal, kcal),
    nutrients,
  };

  const findings: IntegrityFinding[] = [
    ...energyFindings(entries),
    ...favoriteFindings(input.favorites),
    ...duplicateFindings(entries),
    ...orphanPhotoFindings(entries, input.photos),
    ...driftFindings(entries, input.dayTotals),
  ];

  for (const key of NUTRIENTS) {
    const { knownKcalSharePct, trust, topMissing } = nutrients[key];
    if (trust === 'pewne') continue;
    findings.push(gapFinding(
      'micronutrient_gap',
      `micronutrient_gap:${key}`,
      trust === 'niepewne' ? 'warn' : 'info',
      `${NUTRIENT_LABEL[key]}: znany dla ${knownKcalSharePct}% kalorii, suma jest dolną granicą`,
      { nutrient: key, knownKcalSharePct, topMissing },
    ));
  }
  if (summary.provenanceMissingSharePct >= HIGH_PROVENANCE_GAP_PCT) {
    findings.push(gapFinding(
      'provenance_gap', 'provenance_gap', 'info',
      `${summary.provenanceMissingSharePct}% kalorii pochodzi z wpisów bez zapisanego źródła makro`,
      { sharePct: summary.provenanceMissingSharePct },
    ));
  }
  if (summary.estimatedSharePct >= HIGH_ESTIMATE_SHARE_PCT) {
    findings.push(gapFinding(
      'estimate_share_high', 'estimate_share_high', 'info',
      `${summary.estimatedSharePct}% kalorii okresu to szacunek (zdjęcia, AI, powtórki); zakres dnia jest szeroki`,
      { sharePct: summary.estimatedSharePct },
    ));
  }

  return { findings, summary };
}
