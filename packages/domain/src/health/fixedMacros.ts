/**
 * Stały cel makro ustawiony przez użytkownika (`nutrition_profile.fixed_*`): kcal, białko i tłuszcz,
 * a węglowodany są resztą energii (4 kcal/g białka i węgli, 9 kcal/g tłuszczu).
 */
export interface FixedMacros {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FixedMacrosInput {
  fixed_kcal?: number | string | null;
  fixed_protein_g?: number | string | null;
  fixed_fat_g?: number | string | null;
}

const positive = (value: unknown): number | null => {
  const n = value == null || value === '' ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/** Zwraca cel tylko wtedy, gdy ustawiono wszystkie trzy wartości i zostaje miejsce na węglowodany. */
export function resolveFixedMacros(profile: FixedMacrosInput | null | undefined): FixedMacros | null {
  const kcal = positive(profile?.fixed_kcal);
  const protein = positive(profile?.fixed_protein_g);
  const fat = positive(profile?.fixed_fat_g);
  if (kcal == null || protein == null || fat == null) return null;
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  return carbs >= 0 ? { kcal, protein, fat, carbs } : null;
}

/** Cel tygodniowy to siedem dziennych. */
export function weeklyFixedMacros(macros: FixedMacros): FixedMacros {
  return { kcal: macros.kcal * 7, protein: macros.protein * 7, fat: macros.fat * 7, carbs: macros.carbs * 7 };
}
