/**
 * @module usdaFdc
 * @role Mapowanie rekordu USDA FoodData Central (Foundation Foods, SR Legacy) na wartości na 100 g w kontrakcie Sparky.
 *       Numery składników zweryfikowane na plikach nutrient.csv (04/2026 i 04/2018). Braki zostają null, nie zero.
 */

/** Numery składników USDA (nutrient.id), tak jak w plikach CSV. */
export const FDC_NUTRIENT = {
  energyKcal: 1008,
  energyAtwaterSpecific: 2048,
  energyAtwaterGeneral: 2047,
  protein: 1003,
  fat: 1004,
  fatNlea: 1085,
  carbsByDifference: 1005,
  carbsBySummation: 1050,
  fiber: 1079,
  sugars: 2000,
  sugarsNlea: 1063,
  saturatedFat: 1258,
  sodiumMg: 1093,
  water: 1051,
  alcohol: 1018,
} as const;

export interface FdcPortion {
  /** Opis miary po angielsku, np. „1 cup, chopped”. */
  label: string;
  /** Masa jednej miary w gramach. */
  grams: number;
}

export interface FdcFoodInput {
  fdcId: number;
  dataType: 'foundation_food' | 'sr_legacy_food';
  description: string;
  category: string | null;
  publicationDate: string | null;
  /** nutrient_id → ilość na 100 g (sód w mg, reszta w g/kcal). */
  nutrients: ReadonlyMap<number, number>;
  portions: FdcPortion[];
}

export type FdcEnergySource = 'measured' | 'atwater_specific' | 'atwater_general' | 'computed_4_4_9';

export interface UsdaReferenceRow {
  fdcId: number;
  dataType: FdcFoodInput['dataType'];
  description: string;
  category: string | null;
  publicationDate: string | null;
  kcal: number;
  energySource: FdcEnergySource;
  protein: number;
  fat: number;
  /** Węglowodany przyswajalne w rozumieniu etykiety UE (z różnicy minus błonnik, gdy błonnik znany). */
  carbs: number;
  /** Węglowodany „by difference” tak jak w USDA (zawierają błonnik). */
  carbsByDifference: number | null;
  fiber: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  /** Sól g/100 g = sód × 2,5. */
  salt: number | null;
  portions: FdcPortion[];
}

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const firstOf = (nutrients: ReadonlyMap<number, number>, ids: readonly number[]): number | null => {
  for (const id of ids) {
    const value = nutrients.get(id);
    if (value != null && Number.isFinite(value) && value >= 0) return value;
  }
  return null;
};

/** Zwraca null, gdy rekord nie ma białka, tłuszczu i węglowodanów, bo na takim nie da się liczyć posiłku. */
export function mapFdcFood(food: FdcFoodInput): UsdaReferenceRow | null {
  const { nutrients } = food;
  const protein = firstOf(nutrients, [FDC_NUTRIENT.protein]);
  const fat = firstOf(nutrients, [FDC_NUTRIENT.fat, FDC_NUTRIENT.fatNlea]);
  const carbsDiff = firstOf(nutrients, [FDC_NUTRIENT.carbsByDifference, FDC_NUTRIENT.carbsBySummation]);
  if (protein == null || fat == null || carbsDiff == null) return null;

  const fiber = firstOf(nutrients, [FDC_NUTRIENT.fiber]);
  const sodium = firstOf(nutrients, [FDC_NUTRIENT.sodiumMg]);

  const measured = firstOf(nutrients, [FDC_NUTRIENT.energyKcal]);
  const specific = firstOf(nutrients, [FDC_NUTRIENT.energyAtwaterSpecific]);
  const general = firstOf(nutrients, [FDC_NUTRIENT.energyAtwaterGeneral]);
  let kcal: number;
  let energySource: FdcEnergySource;
  if (measured != null) { kcal = measured; energySource = 'measured'; }
  else if (specific != null) { kcal = specific; energySource = 'atwater_specific'; }
  else if (general != null) { kcal = general; energySource = 'atwater_general'; }
  else { kcal = protein * 4 + carbsDiff * 4 + fat * 9; energySource = 'computed_4_4_9'; }

  return {
    fdcId: food.fdcId,
    dataType: food.dataType,
    description: food.description.trim(),
    category: food.category,
    publicationDate: food.publicationDate,
    kcal: round(kcal, 1),
    energySource,
    protein: round(protein),
    fat: round(fat),
    carbs: round(fiber != null ? Math.max(0, carbsDiff - fiber) : carbsDiff),
    carbsByDifference: round(carbsDiff),
    fiber: fiber == null ? null : round(fiber),
    sugar: firstOf(nutrients, [FDC_NUTRIENT.sugars, FDC_NUTRIENT.sugarsNlea]),
    saturatedFat: firstOf(nutrients, [FDC_NUTRIENT.saturatedFat]),
    salt: sodium == null ? null : round((sodium * 2.5) / 1000, 3),
    portions: food.portions,
  };
}
