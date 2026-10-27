import { buildWeeklyNutritionPulse, type WeeklyNutritionPulseData } from '../weeklyNutritionPulse';
import { computeWeekBalance, type WeekBalance } from './weekBalance';
import { computeDayNutrientCoverage, type NutrientCoverage } from './nutrientCoverage';
import type { WeekNutritionInputs } from './weekNutritionApi';

export interface WeekNutrition {
  pulse: WeeklyNutritionPulseData;
  balance: WeekBalance | null;
  /** Błonnik i nasycone z dni, które policzyły się do średnich (bez dzisiejszego). */
  fiber: NutrientCoverage;
  saturatedFat: NutrientCoverage;
  salt?: NutrientCoverage;
}

/** Żywienie tygodnia pon–nd: średnie z zapisanych dni, bilans budżetu kcal i pokrycie błonnika/nasyconych. */
export function buildWeekNutrition(input: {
  data: WeekNutritionInputs;
  weekStart: string;
  today: string;
  proteinGoal: number | null;
  fallbackTarget: number | null;
}): WeekNutrition {
  const { data, weekStart, today, proteinGoal, fallbackTarget } = input;
  const eatenByDate: Record<string, number> = {};
  for (const row of data.rows) eatenByDate[row.date] = row.calories ?? 0;
  const loggedDates = new Set(data.rows.filter((row) => row.date < today && (row.calories ?? 0) > 0).map((row) => row.date));
  const coverage = computeDayNutrientCoverage(data.entries.filter((entry) => loggedDates.has(entry.date)));
  return {
    pulse: buildWeeklyNutritionPulse({ rows: data.rows, proteinGoal, kcalTarget: fallbackTarget, today }),
    balance: computeWeekBalance({ weekStart, today, eatenByDate, targetByDate: data.targetByDate, completenessByDate: data.completenessByDate, fallbackTarget }),
    fiber: coverage.fiber,
    saturatedFat: coverage.saturatedFat,
    salt: coverage.salt,
  };
}
