import { MIN_FULL_DAY_KCAL } from "@vanguard/domain";

interface NutritionDay {
  date: string;
  calories: number | null;
  protein: number | null;
}

/** Dni, z których wolno liczyć średnie jedzenia: minione (nie dziś) i z kalorami co najmniej MIN_FULL_DAY_KCAL. */
export function completeNutritionDays<T extends NutritionDay>(rows: T[] | null | undefined, today: string): T[] {
  return (rows ?? []).filter((row) => row.date < today && (row.calories ?? 0) >= MIN_FULL_DAY_KCAL);
}

export function averageOver(rows: Array<number | null>): number | null {
  const values = rows.filter((value): value is number => typeof value === "number" && value > 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
