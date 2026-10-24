import type { DatedValue } from './aggregate';

export interface NutritionRow {
  date: string;
  calories: unknown;
}

const num = (value: unknown): number | null => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));

/**
 * Dzień z zapisanym jedzeniem, który już się skończył: dzisiejszy jest w toku i zaniżałby średnie
 * (ta sama reguła co „średnia z N pełnych dni” w karcie Odżywianie).
 */
export function completedNutritionDays<T extends NutritionRow>(rows: T[] | null, today: string): T[] {
  return (rows ?? []).filter((row) => row.date < today && (num(row.calories) ?? 0) > 0);
}

/** Seria jednej wartości z pełnych dni; 0 jest poprawną wartością (np. dzień bez błonnika), brak (null) już nie. */
export function nutritionSeries<T extends NutritionRow>(rows: T[] | null, today: string, pick: (row: T) => unknown): DatedValue[] {
  return completedNutritionDays(rows, today).flatMap((row) => {
    const value = num(pick(row));
    return value == null ? [] : [{ date: row.date, value }];
  });
}
