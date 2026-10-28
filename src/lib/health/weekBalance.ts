import { shiftDateStr } from '../date';
import type { NutritionDayCompleteness } from './nutritionTracker';

export interface WeekBalance {
  /** Suma zjedzonych kcal od poniedziałku do dziś (włącznie). */
  eaten: number;
  /** Budżet całego tygodnia pon–nd: cele dni, które były, plus średni cel na pozostałe dni. */
  budget: number;
  remaining: number;
  /** Ile średnio dziennie zostaje na dziś i dni do niedzieli; null, gdy tydzień się skończył. */
  perDayLeft: number | null;
  daysLeft: number;
  /** Dni przed dzisiejszym bez wpisów jedzenia i bez potwierdzenia „dzień kompletny” (budżet liczy je w całości). */
  missingDays: number;
  /** Dni do dzisiaj włącznie oznaczone jako niepełne (część jedzenia nie została zapisana). */
  partialDays: number;
  /** Czy „zostało do zjedzenia” opiera się na pełnych danych; gdy nie, to tylko orientacja. */
  binding: boolean;
}

interface Input {
  weekStart: string;
  today: string;
  eatenByDate: Record<string, number>;
  targetByDate: Record<string, number>;
  /** Cel używany, gdy tydzień nie ma jeszcze żadnych zapisanych celów. */
  fallbackTarget: number | null;
  /** Twoja decyzja o kompletności dni; brak wpisu = nie wiadomo. */
  completenessByDate?: Record<string, NutritionDayCompleteness>;
}

/** Bilans tygodnia pon–nd względem dziennych celów kcal (cel już uwzględnia deficyt i styl życia). */
export function computeWeekBalance({ weekStart, today, eatenByDate, targetByDate, fallbackTarget, completenessByDate = {} }: Input): WeekBalance | null {
  const days = Array.from({ length: 7 }, (_, i) => shiftDateStr(weekStart, i));
  const known = days.filter((d) => d <= today && targetByDate[d] != null).map((d) => targetByDate[d]!);
  const avgTarget = known.length ? known.reduce((a, b) => a + b, 0) / known.length : fallbackTarget;
  if (avgTarget == null || avgTarget <= 0) return null;

  const budget = days.reduce((sum, d) => sum + (targetByDate[d] ?? avgTarget), 0);
  const elapsed = days.filter((d) => d <= today);
  const past = elapsed.filter((d) => d < today);
  const eaten = elapsed.reduce((sum, d) => sum + (eatenByDate[d] ?? 0), 0);
  const daysLeft = days.filter((d) => d >= today).length;
  const remaining = Math.round(budget - eaten);
  // Potwierdzony pełny dzień bez wpisów to świadomy post, nie dziura w dzienniku.
  const missingDays = past.filter((d) => !(eatenByDate[d] > 0) && (!completenessByDate[d] || completenessByDate[d] === 'unknown')).length;
  const partialDays = elapsed.filter((d) => completenessByDate[d] === 'partial').length;
  return {
    eaten: Math.round(eaten),
    budget: Math.round(budget),
    remaining,
    perDayLeft: daysLeft > 0 ? Math.round(remaining / daysLeft) : null,
    daysLeft,
    missingDays,
    partialDays,
    binding: missingDays === 0 && partialDays === 0,
  };
}
