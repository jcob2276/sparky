import type { ParsedFoodItem } from './foodLogging';
import type { MealDraftItem } from './nutritionTracker';

export type PortionUnit =
  | 'g'
  | 'piece'
  | 'slice'
  | 'tbsp'
  | 'tsp'
  | 'package'
  | 'bowl'
  | 'portion'
  | 'glass'
  | 'cup'
  | 'handful';

export const PORTION_UNIT_LABELS: Record<PortionUnit, string> = {
  g: 'g',
  piece: 'szt',
  slice: 'kromka',
  tbsp: 'łyżka',
  tsp: 'łyżeczka',
  package: 'opak.',
  bowl: 'miska',
  portion: 'porcja',
  glass: 'szklanka',
  cup: 'kubek',
  handful: 'garść',
};

export const DRAFT_UNIT_OPTIONS: PortionUnit[] = [
  'g', 'piece', 'slice', 'tbsp', 'package', 'glass', 'cup', 'handful', 'bowl', 'portion',
];

const FRACTION_QUANTITIES = [0.25, 0.5, 1, 1.5, 2] as const;

const DEFAULT_GRAMS_PER_UNIT: Partial<Record<PortionUnit, number>> = {
  tbsp: 15,
  tsp: 5,
  slice: 30,
  bowl: 300,
  portion: 200,
  package: 100,
  piece: 60,
  glass: 200,
  cup: 250,
  handful: 30,
};

export interface PortionState {
  unit: PortionUnit;
  quantity: number;
  gramsPerUnit: number;
}

export interface PortionChip {
  label: string;
  state: PortionState;
}

function normalizeUnit(raw: string | undefined): PortionUnit {
  if (!raw) return 'g';
  if (raw === 'piece' || raw === 'szt') return 'piece';
  if (raw === 'slice') return 'slice';
  if (raw === 'tbsp' || raw === 'lyzka') return 'tbsp';
  if (raw === 'tsp') return 'tsp';
  if (raw === 'package') return 'package';
  if (raw === 'bowl') return 'bowl';
  if (raw === 'portion') return 'portion';
  if (raw === 'glass' || raw === 'szklanka') return 'glass';
  if (raw === 'cup' || raw === 'kubek') return 'cup';
  if (raw === 'handful' || raw === 'garsc') return 'handful';
  return 'g';
}

export function inferPortionState(item: ParsedFoodItem): PortionState {
  const unit = normalizeUnit(item.parseMeta?.unit);
  const declaredQty = item.parseMeta?.quantity;
  if (unit !== 'g' && declaredQty != null && declaredQty > 0) {
    return {
      unit,
      quantity: declaredQty,
      gramsPerUnit: Math.max(1, item.grams / declaredQty),
    };
  }
  if (unit !== 'g') {
    const defaultG = item.parseMeta?.defaultGrams && item.parseMeta.defaultGrams > 0
      ? item.parseMeta.defaultGrams
      : (DEFAULT_GRAMS_PER_UNIT[unit] ?? 100);
    const qty = Math.max(1, Math.round((item.grams / defaultG) * 10) / 10);
    return { unit, quantity: qty, gramsPerUnit: defaultG };
  }
  const pieceMatch = item.name.match(/^(\d+)\s*[x×]?\s/i) || item.assumptions?.join(' ').match(/(\d+)\s*szt/i);
  if (pieceMatch) {
    const qty = Number(pieceMatch[1]);
    if (qty > 0 && qty <= 20) {
      return { unit: 'piece', quantity: qty, gramsPerUnit: Math.max(1, item.grams / qty) };
    }
  }
  return { unit: 'g', quantity: item.grams, gramsPerUnit: 1 };
}

export function scaleDraftItem(item: MealDraftItem, newGrams: number): MealDraftItem {
  const baseGrams = item.parseMeta?.baseGrams ?? (item.grams > 0 ? item.grams : 100);
  const baseCalories = item.parseMeta?.baseCalories ?? item.calories;
  const baseProtein = item.parseMeta?.baseProtein ?? item.protein;
  const baseCarbs = item.parseMeta?.baseCarbs ?? item.carbs;
  const baseFat = item.parseMeta?.baseFat ?? item.fat;
  const baseFiber = item.parseMeta?.baseFiber ?? item.fiber;
  const baseSugar = item.parseMeta?.baseSugar ?? item.sugar;
  const baseSaturatedFat = item.parseMeta?.baseSaturatedFat ?? item.saturatedFat;
  const baseSalt = item.parseMeta?.baseSalt ?? item.salt;

  const grams = Math.max(0, Math.round(newGrams));
  const factor = baseGrams > 0 ? grams / baseGrams : 0;
  const scale = (value: number | undefined) => (value == null ? undefined : Math.round(value * factor * 10) / 10);
  return {
    ...item,
    grams,
    calories: Math.round(baseCalories * factor),
    protein: scale(baseProtein) ?? 0,
    carbs: scale(baseCarbs) ?? 0,
    fat: scale(baseFat) ?? 0,
    fiber: scale(baseFiber),
    sugar: scale(baseSugar),
    saturatedFat: scale(baseSaturatedFat),
    salt: baseSalt == null ? undefined : Math.round(baseSalt * factor * 100) / 100,
    parseMeta: {
      ...(item.parseMeta ?? { macroSource: 'llm_estimate', parserVersion: 'composer-v1' }),
      baseGrams,
      baseCalories,
      baseProtein,
      baseCarbs,
      baseFat,
      baseFiber,
      baseSugar,
      baseSaturatedFat,
      baseSalt,
    },
  };
}

function gramsFromPortion(state: PortionState): number {
  if (state.unit === 'g') return Math.max(0, Math.round(state.quantity));
  return Math.max(0, Math.round(state.quantity * state.gramsPerUnit));
}

export function applyPortionState(item: MealDraftItem, state: PortionState): MealDraftItem {
  const next = scaleDraftItem(item, gramsFromPortion(state));
  const quantity = state.unit === 'g' ? next.grams : state.quantity;
  return {
    ...next,
    parseMeta: {
      ...(item.parseMeta ?? { macroSource: 'llm_estimate', parserVersion: 'composer-v1' }),
      ...next.parseMeta,
      quantity,
      unit: state.unit === 'g' ? 'g' : state.unit,
      explicitGrams: state.unit === 'g',
    },
  };
}

export function switchPortionUnit(item: MealDraftItem, nextUnit: PortionUnit): PortionState {
  const current = inferPortionState(item);
  const metaDefault = readDefaultGrams(item);
  const gramsPerUnit = nextUnit === 'g'
    ? 1
    : current.unit === nextUnit
      ? current.gramsPerUnit
      : metaDefault && nextUnit === 'piece'
        ? metaDefault
        : DEFAULT_GRAMS_PER_UNIT[nextUnit] ?? Math.max(1, Math.round(item.grams / Math.max(1, current.quantity)));
  const quantity = nextUnit === 'g'
    ? item.grams
    : current.unit === nextUnit
      ? current.quantity
      : metaDefault && nextUnit === 'piece'
        ? Math.max(1, Math.round(item.grams / metaDefault))
        : Math.max(1, Math.round(item.grams / gramsPerUnit));
  return { unit: nextUnit, quantity, gramsPerUnit };
}

function readDefaultGrams(item: MealDraftItem): number | null {
  const value = item.parseMeta?.defaultGrams;
  return value != null && value > 0 ? Math.round(value) : null;
}

function formatFraction(quantity: number): string {
  if (quantity === 0.25) return '¼';
  if (quantity === 0.5) return '½';
  if (quantity === 1.5) return '1½';
  if (Number.isInteger(quantity)) return String(quantity);
  return String(quantity).replace('.', ',');
}

export function buildPortionChips(
  item: MealDraftItem,
  rememberedGrams?: number | null,
  currentState?: PortionState,
): PortionChip[] {
  const chips: PortionChip[] = [];
  const seen = new Set<string>();
  const push = (label: string, state: PortionState) => {
    const key = `${state.unit}:${state.quantity}:${state.gramsPerUnit}`;
    if (seen.has(key)) return;
    seen.add(key);
    chips.push({ label, state });
  };

  const base = currentState ?? inferPortionState(item);
  const defaultGrams = readDefaultGrams(item);

  if (rememberedGrams && rememberedGrams > 0) {
    push(`Twoja ${rememberedGrams}g`, { unit: 'g', quantity: rememberedGrams, gramsPerUnit: 1 });
  }
  if (defaultGrams) {
    push(`Porcja ${defaultGrams}g`, { unit: 'g', quantity: defaultGrams, gramsPerUnit: 1 });
    if (defaultGrams !== item.grams) {
      push('1 szt', { unit: 'piece', quantity: 1, gramsPerUnit: defaultGrams });
    }
  }

  if (base.unit !== 'g') {
    const pieceQuantities = base.gramsPerUnit <= 30 && base.unit === 'piece'
      ? [1, 2, 3, 5, 6, 8, 10]
      : FRACTION_QUANTITIES;

    for (const quantity of pieceQuantities) {
      const label = quantity === 1
        ? `1 ${PORTION_UNIT_LABELS[base.unit]}`
        : `${formatFraction(quantity)} ${PORTION_UNIT_LABELS[base.unit]}`;
      push(label, { unit: base.unit, quantity, gramsPerUnit: base.gramsPerUnit });
    }
  } else {
    for (const grams of [50, 100, 150, 200, 250]) {
      push(`${grams}g`, { unit: 'g', quantity: grams, gramsPerUnit: 1 });
    }
  }

  return chips.slice(0, 8);
}

export function draftTotals(items: MealDraftItem[]) {
  return items.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: Math.round((acc.protein + item.protein) * 10) / 10,
    carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
    fat: Math.round((acc.fat + item.fat) * 10) / 10,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
