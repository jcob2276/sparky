import type { MicronutrientKey } from './foodIntegrity.ts';

/** Skąd pochodzi wartość: ze źródła danych (etykieta, baza, biblioteka) czy z oszacowania modelu. */
export type MicronutrientOrigin = 'data' | 'estimate';
export type MicronutrientSources = Partial<Record<MicronutrientKey, MicronutrientOrigin>>;

/** Wartości w gramach dla całej porcji; brak pola = nie wiadomo (nie 0). */
export interface MicronutrientValues {
  fiber?: number | null;
  sugar?: number | null;
  saturatedFat?: number | null;
  salt?: number | null;
}

export interface MergedMicronutrients {
  values: { fiber?: number; sugar?: number; saturatedFat?: number; salt?: number };
  sources: MicronutrientSources;
}

const FIELDS: Array<[keyof MicronutrientValues, MicronutrientKey]> = [
  ['fiber', 'fiber'],
  ['sugar', 'sugar'],
  ['saturatedFat', 'saturated_fat'],
  ['salt', 'salt'],
];

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;
const isNumber = (value: number | null | undefined): value is number => value != null && Number.isFinite(value);

/**
 * Wartość ze źródła danych wygrywa; gdy źródło jej nie ma, zostaje oszacowanie modelu oznaczone jako „estimate”,
 * zamiast po cichu znikać (dopasowanie produktu nie może kasować wiedzy o nasyconych i soli).
 * Nasycone nie mogą przekroczyć tłuszczu, sól nie może ważyć więcej niż porcja.
 */
export function mergeMicronutrients(
  matched: MicronutrientValues,
  estimated: MicronutrientValues,
  caps: { fatG: number; grams: number },
): MergedMicronutrients {
  const values: MergedMicronutrients['values'] = {};
  const sources: MicronutrientSources = {};
  for (const [field, key] of FIELDS) {
    const fromData = matched[field];
    const fromEstimate = estimated[field];
    const raw = isNumber(fromData) ? fromData : isNumber(fromEstimate) ? fromEstimate : null;
    if (raw == null) continue;
    let value = Math.max(0, raw);
    if (field === 'saturatedFat') value = Math.min(value, Math.max(0, caps.fatG));
    if (field === 'salt') value = Math.min(value, Math.max(0, caps.grams));
    values[field] = field === 'salt' ? round2(value) : round1(value);
    sources[key] = isNumber(fromData) ? 'data' : 'estimate';
  }
  return { values, sources };
}

/** Pozycja, której brakujące składniki można uzupełnić szacunkiem (kształt zgodny z ParsedFoodItem). */
export interface EstimableItem {
  grams: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  salt?: number;
  parseMeta?: { micronutrientSources?: MicronutrientSources; macroSource?: string };
}

const SOURCE_KEYS: Array<[keyof MicronutrientValues, MicronutrientKey]> = FIELDS;

/** Indeksy pozycji, którym brakuje choć jednego z czterech składników. */
export function indexesMissingMicronutrients(items: EstimableItem[]): number[] {
  return items.flatMap((item, index) => (
    item.fiber == null || item.sugar == null || item.saturatedFat == null || item.salt == null ? [index] : []
  ));
}

function readNumber(value: unknown): number | undefined {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : undefined;
}

/**
 * Wstawia oszacowania modelu (`{items:[{index, fiber, sugar, saturatedFat, salt}]}`) tylko w puste pola.
 * Wartości już znane zostają, a ich pochodzenie (data/estimate) jest zachowane; nowe dostają `estimate`.
 */
export function applyMicronutrientEstimates<T extends EstimableItem>(items: T[], raw: unknown): T[] {
  const entries = raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
    ? (raw as { items: unknown[] }).items
    : [];
  const estimateByIndex = new Map<number, MicronutrientValues>();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const index = readNumber(record.index);
    if (index == null || !Number.isInteger(index) || index < 0 || index >= items.length) continue;
    estimateByIndex.set(index, {
      fiber: readNumber(record.fiber),
      sugar: readNumber(record.sugar),
      saturatedFat: readNumber(record.saturatedFat),
      salt: readNumber(record.salt),
    });
  }
  return items.map((item, index) => {
    const estimate = estimateByIndex.get(index);
    if (!estimate) return item;
    const current: MicronutrientValues = { fiber: item.fiber, sugar: item.sugar, saturatedFat: item.saturatedFat, salt: item.salt };
    const merged = mergeMicronutrients(current, estimate, { fatG: item.fat, grams: item.grams });
    const previous = item.parseMeta?.micronutrientSources ?? {};
    const sources: MicronutrientSources = { ...merged.sources };
    // Wartość bez zapisanego źródła pochodzi z pozycji liczonej przez model (llm_estimate) albo ze źródła danych.
    const unrecordedOrigin: MicronutrientOrigin = item.parseMeta?.macroSource === 'llm_estimate' ? 'estimate' : 'data';
    for (const [field, key] of SOURCE_KEYS) {
      if (current[field] != null) sources[key] = previous[key] ?? unrecordedOrigin;
    }
    return {
      ...item,
      ...merged.values,
      parseMeta: item.parseMeta ? { ...item.parseMeta, micronutrientSources: sources } : item.parseMeta,
    } as T;
  });
}
