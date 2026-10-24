import type { DatedValue } from './aggregate';

export interface NutritionRow {
  date: string;
  calories: unknown;
}

const num = (value: unknown): number | null => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));

/** Dzień jedzenia poniżej tej liczby kcal to prawie na pewno niepełny zapis (np. wpisany dopiero wieczorem). */
export const MIN_FULL_DAY_KCAL = 1000;

/**
 * Dzień z zapisanym jedzeniem, który już się skończył i wygląda na pełny: dzisiejszy jest w toku, a dzień poniżej
 * `MIN_FULL_DAY_KCAL` to zwykle niepełny zapis; oba zaniżałyby średnie.
 */
export function completedNutritionDays<T extends NutritionRow>(rows: T[] | null, today: string): T[] {
  return (rows ?? []).filter((row) => row.date < today && (num(row.calories) ?? 0) >= MIN_FULL_DAY_KCAL);
}

/** Seria jednej wartości z pełnych dni; 0 jest poprawną wartością (np. dzień bez błonnika), brak (null) już nie. */
export function nutritionSeries<T extends NutritionRow>(rows: T[] | null, today: string, pick: (row: T) => unknown): DatedValue[] {
  return completedNutritionDays(rows, today).flatMap((row) => {
    const value = num(pick(row));
    return value == null ? [] : [{ date: row.date, value }];
  });
}
