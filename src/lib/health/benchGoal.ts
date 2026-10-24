import { shiftDateStr } from '../date';

export const BENCH_GOAL_EXERCISE = 'Wyciskanie płaskie';
const BENCH_GOAL_KG = 100;

type BenchGoalStatus = 'no-data' | 'few-sessions' | 'reached' | 'flat' | 'on-track';

export interface BenchGoal {
  status: BenchGoalStatus;
  goalKg: number;
  bestE1rm: number | null;
  remainingKg: number | null;
  pct: number | null;
  sessions: number;
  weeklyGainKg: number | null;
  etaDate: string | null;
}

const MIN_SESSIONS = 4;
const MIN_SPAN_DAYS = 21;
const MAX_ETA_DAYS = 3 * 365;
const MIN_WEEKLY_GAIN = 0.1;

const dayIndex = (date: string) => Math.round(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000);

/** Nachylenie prostej (kg na tydzień) przez punkty e1RM; null, gdy punkty są w jednym dniu. */
function weeklySlope(points: Array<{ date: string; e1rm: number }>): number | null {
  const xs = points.map((p) => dayIndex(p.date));
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = points.reduce((a, p) => a + p.e1rm, 0) / n;
  const denom = xs.reduce((a, x) => a + (x - meanX) ** 2, 0);
  if (denom === 0) return null;
  const perDay = xs.reduce((a, x, i) => a + (x - meanX) * (points[i].e1rm - meanY), 0) / denom;
  return Math.round(perDay * 7 * 100) / 100;
}

/**
 * Postęp do celu w wyciskaniu z historii e1RM. Prognozę podaje dopiero od 4 sesji z rozpiętością 3 tygodni,
 * bo przy mniejszej próbie nachylenie to zgadywanie.
 */
export function buildBenchGoal(points: Array<{ date: string; e1rm: number }>, today: string, goalKg = BENCH_GOAL_KG): BenchGoal {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const best = sorted.length ? Math.max(...sorted.map((p) => p.e1rm)) : null;
  const base = { goalKg, bestE1rm: best, sessions: sorted.length, weeklyGainKg: null, etaDate: null };
  if (best == null) return { ...base, status: 'no-data', remainingKg: null, pct: null };
  const remainingKg = Math.max(0, Math.round((goalKg - best) * 10) / 10);
  const pct = Math.min(100, Math.round((best / goalKg) * 100));
  if (best >= goalKg) return { ...base, status: 'reached', remainingKg: 0, pct: 100 };
  const span = dayIndex(sorted[sorted.length - 1].date) - dayIndex(sorted[0].date);
  if (sorted.length < MIN_SESSIONS || span < MIN_SPAN_DAYS) return { ...base, status: 'few-sessions', remainingKg, pct };
  const slope = weeklySlope(sorted);
  if (slope == null || slope < MIN_WEEKLY_GAIN) return { ...base, status: 'flat', remainingKg, pct, weeklyGainKg: slope };
  const daysLeft = Math.ceil((remainingKg / slope) * 7);
  if (daysLeft > MAX_ETA_DAYS) return { ...base, status: 'flat', remainingKg, pct, weeklyGainKg: slope };
  return { ...base, status: 'on-track', remainingKg, pct, weeklyGainKg: slope, etaDate: shiftDateStr(today, daysLeft) };
}
