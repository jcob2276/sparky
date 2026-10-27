import { readMicronutrientSources } from '@vanguard/domain';

export type FoodSource =
  | 'confirmed'
  | 'history'
  | 'label_ocr'
  | 'off'
  | 'reference_pl'
  | 'generic'
  | 'estimated';

export type FoodTrustLevel = 'confirmed' | 'reference' | 'estimated' | 'incomplete';

export interface FoodTrustInput {
  nutrient_sources?: import('@vanguard/domain').MicronutrientSources;
  fiber?: number | null;
  sugar?: number | null;
  saturated_fat?: number | null;
  salt?: number | null;
  source?: FoodSource | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  confidence?: 'high' | 'medium' | 'low';
}

export interface FoodTrust {
  level: FoodTrustLevel;
  uncertaintyPct: number | null;
  label: string;
}

export function deriveFoodTrust(food: FoodTrustInput): FoodTrust {
  if (food.calories == null || food.calories < 0) {
    return { level: 'incomplete', uncertaintyPct: null, label: 'Brak danych' };
  }
  if (food.source === 'confirmed' || food.source === 'history') {
    return { level: 'confirmed', uncertaintyPct: 3, label: 'Potwierdzone' };
  }
  if (food.source === 'label_ocr') {
    if (food.confidence === 'low') return { level: 'estimated', uncertaintyPct: 25, label: 'Etykieta do sprawdzenia' };
    if (food.confidence === 'medium') return { level: 'reference', uncertaintyPct: 10, label: 'Z etykiety · sprawdź' };
    return { level: 'confirmed', uncertaintyPct: 5, label: 'Z etykiety' };
  }
  if (food.source === 'off' || food.source === 'reference_pl') {
    return { level: 'reference', uncertaintyPct: 10, label: 'Dane referencyjne' };
  }
  return { level: 'estimated', uncertaintyPct: 25, label: 'Szacunek' };
}

export type MacroSource = 'library' | 'generic' | 'reference_pl' | 'off' | 'llm_estimate' | 'user_correction';

const MACRO_SOURCES: readonly string[] = ['library', 'generic', 'reference_pl', 'off', 'llm_estimate', 'user_correction'];

export function isMacroSource(value: unknown): value is MacroSource {
  return typeof value === 'string' && MACRO_SOURCES.includes(value);
}

export function readFoodProvenance(meta: unknown) {
  const record = meta && typeof meta === 'object' ? meta as Record<string, unknown> : {};
  return {
    macroSource: isMacroSource(record.macroSource) ? record.macroSource : undefined,
    micronutrientSources: readMicronutrientSources(record.micronutrientSources),
    explicitGrams: typeof record.explicitGrams === 'boolean' ? record.explicitGrams : undefined,
    uncertaintyPct: typeof record.uncertainty_pct === 'number' && Number.isFinite(record.uncertainty_pct)
      ? record.uncertainty_pct : undefined,
  };
}

export function confidenceFromUncertainty(pct: number | undefined): 'high' | 'medium' | 'low' {
  if (pct == null || pct <= 12) return 'high';
  return pct <= 22 ? 'medium' : 'low';
}

export interface ItemUncertaintyInput {
  macroSource?: MacroSource | null;
  itemSource?: 'llm' | 'database' | 'library';
  confidence?: 'high' | 'medium' | 'low';
  explicitGrams?: boolean;
  inputMode?: string;
  /** Niepewność wpisu, z którego kopiujemy; kopia nigdy nie jest pewniejsza od oryginału. */
  priorUncertaintyPct?: number | null;
}

const MIN_UNCERTAINTY_PCT = 3;
const MAX_UNCERTAINTY_PCT = 50;

function macroUncertaintyPct({ macroSource, itemSource, confidence = 'medium' }: ItemUncertaintyInput): number {
  if (macroSource === 'user_correction') return 3;
  if (macroSource === 'library' || (macroSource == null && itemSource !== 'llm')) return 5;
  if (macroSource === 'off' || macroSource === 'reference_pl' || macroSource === 'generic') {
    return { high: 8, medium: 12, low: 20 }[confidence];
  }
  return { high: 15, medium: 25, low: 35 }[confidence];
}

function portionUncertaintyPct(input: ItemUncertaintyInput): number {
  if (input.explicitGrams) return 0;
  if (input.inputMode === 'photo') return 20;
  return input.macroSource === 'llm_estimate' || input.itemSource === 'llm' ? 15 : 8;
}

/** Błąd źródła makro i błąd porcji są niezależne, więc składają się w sumie kwadratowej (nie w średniej z deklaracji LLM). */
export function deriveItemUncertainty(input: ItemUncertaintyInput): number {
  const combined = Math.hypot(macroUncertaintyPct(input), portionUncertaintyPct(input));
  const floor = Number.isFinite(input.priorUncertaintyPct) ? Number(input.priorUncertaintyPct) : 0;
  return Math.min(MAX_UNCERTAINTY_PCT, Math.max(MIN_UNCERTAINTY_PCT, Math.round(combined), Math.round(floor)));
}

export function calorieRange(calories: number | null, uncertaintyPct: number | null) {
  if (calories == null || uncertaintyPct == null) return null;
  const delta = calories * uncertaintyPct / 100;
  return { min: Math.max(0, Math.round(calories - delta)), max: Math.round(calories + delta) };
}

export function foodTrustMeta(food: FoodTrustInput) {
  const trust = deriveFoodTrust(food);
  const origin = food.source === 'off' || food.source === 'label_ocr' || food.source === 'reference_pl' ? 'data' : 'unknown';
  const micronutrientSources = Object.fromEntries(
    (['fiber', 'sugar', 'saturated_fat', 'salt'] as const)
      .filter((key) => food[key] != null)
      .map((key) => [key, food.nutrient_sources?.[key] ?? origin]),
  );
  return {
    micronutrientSources,
    source: food.source ?? 'estimated',
    trust_level: trust.level,
    uncertainty_pct: trust.uncertaintyPct,
    parser_version: 'food-trust-v1',
  };
}
