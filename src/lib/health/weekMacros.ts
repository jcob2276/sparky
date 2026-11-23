import { shiftDateStr } from '../date';

type MacroKey = 'protein' | 'fat' | 'carbs';
export type DayMacros = Partial<Record<MacroKey, number>>;

interface WeekMacro {
  eaten: number;
  /** Cel całego tygodnia: cele dni, które były, plus średni cel na pozostałe dni. */
  budget: number;
  /** Zjedzone ponad proporcjonalną część budżetu (dni od poniedziałku do dziś liczone w całości). */
  overPace: boolean;
}
export type WeekMacros = Partial<Record<MacroKey, WeekMacro>>;

interface Input {
  weekStart: string;
  today: string;
  eatenByDate: Record<string, DayMacros>;
  targetByDate: Record<string, DayMacros>;
  /** Cel dnia używany, gdy tydzień nie ma jeszcze zapisanych celów makro. */
  fallback: DayMacros;
}

const KEYS: MacroKey[] = ['protein', 'fat', 'carbs'];

/** Tygodniowy bilans białka, tłuszczu i węgli względem dziennych celów (siedem dni = siedem celów). */
export function computeWeekMacros({ weekStart, today, eatenByDate, targetByDate, fallback }: Input): WeekMacros {
  const days = Array.from({ length: 7 }, (_, i) => shiftDateStr(weekStart, i));
  const elapsed = days.filter((d) => d <= today);
  const result: WeekMacros = {};
  for (const key of KEYS) {
    const known = elapsed.map((d) => targetByDate[d]?.[key]).filter((v): v is number => v != null && v > 0);
    const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : fallback[key];
    if (avg == null || avg <= 0) continue;
    const budget = days.reduce((sum, d) => sum + (targetByDate[d]?.[key] ?? avg), 0);
    const eaten = elapsed.reduce((sum, d) => sum + (eatenByDate[d]?.[key] ?? 0), 0);
    result[key] = { eaten: Math.round(eaten), budget: Math.round(budget), overPace: eaten > (budget * elapsed.length) / 7 };
  }
  return result;
}
