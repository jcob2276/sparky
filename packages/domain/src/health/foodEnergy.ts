/** Atwater: kcal z makro. Błonnik i polialkohole mieszczą się w tolerancji, alkohol ma osobny wyjątek. */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;
/** Czysty tłuszcz ma ~900 kcal/100 g; wyżej to błąd danych (np. porcja zapisana jako 100 g). */
const MAX_KCAL_PER_GRAM = 9.1;
const MACRO_MASS_TOLERANCE = 1.05;
const MIN_COMPARABLE_MACRO_KCAL = 15;
const ABSOLUTE_TOLERANCE_KCAL = 25;
const RELATIVE_TOLERANCE = 0.25;
const ALCOHOL_NAME = /(piwo|wino|wodka|whisk|rum\b|gin\b|likier|cydr|nalewka|alkohol|drink)/;

export interface EnergyCheckInput {
  calories: number | null | undefined;
  protein: number | null | undefined;
  carbs: number | null | undefined;
  fat: number | null | undefined;
  name?: string;
}

export type EnergyMismatchReason =
  | 'kcal_zero_with_macros'
  | 'kcal_placeholder_100'
  | 'kcal_differs_from_macros'
  | 'kcal_exceeds_fat_limit'
  | 'macros_exceed_portion';

export interface EnergyConsistency {
  status: 'ok' | 'unknown' | 'mismatch';
  /** kcal wyliczone z makro dla tej samej porcji. */
  macroKcal: number;
  reason?: EnergyMismatchReason;
}

export function macroEnergyKcal(food: Pick<EnergyCheckInput, 'protein' | 'carbs' | 'fat'>): number {
  return Math.round(
    KCAL_PER_G.protein * Number(food.protein ?? 0)
    + KCAL_PER_G.carbs * Number(food.carbs ?? 0)
    + KCAL_PER_G.fat * Number(food.fat ?? 0),
  );
}

function normalizeName(name: string | undefined): string {
  return (name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
}

/**
 * Czy kcal zgadzają się z makro tej samej porcji (`grams`, domyślnie 100 g jak w bazach per 100 g).
 * `unknown` = brak podstaw do oceny (woda, kawa, brak makro), nigdy nie jest odrzuceniem.
 */
export function assessEnergyConsistency(food: EnergyCheckInput, grams = 100): EnergyConsistency {
  const macroKcal = macroEnergyKcal(food);
  const calories = food.calories;
  if (calories == null || !Number.isFinite(calories) || grams <= 0) return { status: 'unknown', macroKcal };

  if (calories > MAX_KCAL_PER_GRAM * grams) return { status: 'mismatch', macroKcal, reason: 'kcal_exceeds_fat_limit' };

  const macroMass = Number(food.protein ?? 0) + Number(food.carbs ?? 0) + Number(food.fat ?? 0);
  if (macroMass > grams * MACRO_MASS_TOLERANCE) return { status: 'mismatch', macroKcal, reason: 'macros_exceed_portion' };

  if (macroKcal < MIN_COMPARABLE_MACRO_KCAL) return { status: 'unknown', macroKcal };

  const diff = Math.abs(calories - macroKcal);
  const allowed = Math.max(ABSOLUTE_TOLERANCE_KCAL * grams / 100, RELATIVE_TOLERANCE * Math.max(calories, macroKcal));
  if (diff <= allowed) return { status: 'ok', macroKcal };
  if (calories > macroKcal && ALCOHOL_NAME.test(normalizeName(food.name))) return { status: 'ok', macroKcal };

  const reason: EnergyMismatchReason = calories === 0
    ? 'kcal_zero_with_macros'
    : calories === grams ? 'kcal_placeholder_100' : 'kcal_differs_from_macros';
  return { status: 'mismatch', macroKcal, reason };
}

const REASON_LABEL: Record<EnergyMismatchReason, string> = {
  kcal_zero_with_macros: '0 kcal przy niezerowych makro',
  kcal_placeholder_100: 'kcal równe gramom (1 kcal/g) zamiast wartości z makro',
  kcal_differs_from_macros: 'kcal nie zgadzają się z makro',
  kcal_exceeds_fat_limit: 'kcal powyżej fizycznego maksimum (czysty tłuszcz)',
  macros_exceed_portion: 'makro ważą więcej niż porcja',
};

export function describeEnergyMismatch(check: EnergyConsistency, calories: number): string {
  const label = check.reason ? REASON_LABEL[check.reason] : 'niespójne kcal';
  return `${label}: ${Math.round(calories)} kcal vs ${check.macroKcal} z makro`;
}
