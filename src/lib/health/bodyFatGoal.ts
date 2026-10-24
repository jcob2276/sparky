import { shiftDateStr } from '../date';

export interface DatedPoint {
  date: string;
  value: number;
}

type BodyFatGoalStatus = 'no-data' | 'reached' | 'few-measurements' | 'rising' | 'flat' | 'falling';

export interface BodyFatGoal {
  status: BodyFatGoalStatus;
  goal: number;
  currentBf: number | null;
  currentDate: string | null;
  remainingPp: number | null;
  /** Ile kg trzeba stracić, żeby przy tej samej masie mięśniowej zejść do celu. */
  kgToLose: number | null;
  /** Data celu przy bezpiecznym, stałym tempie redukcji (scenariusz, a nie przewidywanie). */
  scenarioEta: string | null;
  scenarioPaceKg: number;
  slopePpPerWeek: number | null;
  trendEta: string | null;
  bfPointsUsed: number;
  facts: string[];
}

const SCENARIO_PACE_KG = 0.5;
const HISTORY_DAYS = 120;
const MIN_POINTS = 3;
const MIN_SPAN_DAYS = 28;
const FLAT_BAND_PP_PER_WEEK = 0.05;
const MAX_ETA_DAYS = 2 * 365;

const dayIndex = (date: string) => Math.round(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000);
const round1 = (value: number) => Math.round(value * 10) / 10;
const sortAsc = (points: DatedPoint[]) => [...points].sort((a, b) => a.date.localeCompare(b.date));

function weeklySlope(points: DatedPoint[]): number | null {
  const xs = points.map((p) => dayIndex(p.date));
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = points.reduce((a, p) => a + p.value, 0) / points.length;
  const denom = xs.reduce((a, x) => a + (x - meanX) ** 2, 0);
  if (denom === 0) return null;
  return (xs.reduce((a, x, i) => a + (x - meanX) * (points[i].value - meanY), 0) / denom) * 7;
}

function changeFact(label: string, unit: string, points: DatedPoint[], since: string): string | null {
  const window = sortAsc(points.filter((p) => p.date >= since));
  if (window.length < 2) return null;
  const first = window[0];
  const last = window[window.length - 1];
  if (dayIndex(last.date) - dayIndex(first.date) < 14) return null;
  const delta = round1(last.value - first.value);
  if (delta === 0) return `${label} bez zmian od ${first.date.slice(5)}.`;
  return `${label} ${delta > 0 ? '+' : ''}${String(delta).replace('.', ',')} ${unit} od ${first.date.slice(5)}.`;
}

/**
 * Cel tłuszczu: ile brakuje, ile kg to oznacza i kiedy cel wypada przy bezpiecznym tempie. Prawdziwy trend podaje dopiero od
 * 3 pomiarów BF rozłożonych na 4 tygodnie, bo przy mniejszej próbie (i różnych metodach pomiaru) nachylenie to zgadywanie.
 */
export function buildBodyFatGoal(input: { bf: DatedPoint[]; weight: DatedPoint[]; waist: DatedPoint[]; goal: number; today: string }): BodyFatGoal {
  const { goal, today } = input;
  const since = shiftDateStr(today, -HISTORY_DAYS);
  const bfAll = sortAsc(input.bf);
  const latest = bfAll[bfAll.length - 1] ?? null;
  const facts = [
    changeFact('Waga', 'kg', input.weight, since),
    changeFact('Talia', 'cm', input.waist, since),
  ].flatMap((f) => (f ? [f] : []));
  const base: BodyFatGoal = {
    status: 'no-data', goal, currentBf: latest?.value ?? null, currentDate: latest?.date ?? null, remainingPp: null, kgToLose: null,
    scenarioEta: null, scenarioPaceKg: SCENARIO_PACE_KG, slopePpPerWeek: null, trendEta: null, bfPointsUsed: 0, facts,
  };
  if (!latest) return base;
  const remainingPp = Math.max(0, round1(latest.value - goal));
  if (latest.value <= goal) return { ...base, status: 'reached', remainingPp: 0, kgToLose: 0 };

  const weightAtBf = input.weight.find((p) => p.date === latest.date)?.value ?? sortAsc(input.weight).at(-1)?.value ?? null;
  const kgToLose = weightAtBf == null ? null : round1((weightAtBf * (latest.value - goal)) / (100 - goal));
  const scenarioEta = kgToLose == null ? null : shiftDateStr(today, Math.ceil(kgToLose / SCENARIO_PACE_KG) * 7);
  const recent = bfAll.filter((p) => p.date >= since);
  const filled = { ...base, remainingPp, kgToLose, scenarioEta, bfPointsUsed: recent.length };
  const span = recent.length ? dayIndex(recent[recent.length - 1].date) - dayIndex(recent[0].date) : 0;
  if (recent.length < MIN_POINTS || span < MIN_SPAN_DAYS) return { ...filled, status: 'few-measurements' };

  const slope = weeklySlope(recent);
  if (slope == null) return { ...filled, status: 'few-measurements' };
  const slopePpPerWeek = round1(slope * 10) / 10;
  if (slope > FLAT_BAND_PP_PER_WEEK) return { ...filled, status: 'rising', slopePpPerWeek };
  if (slope >= -FLAT_BAND_PP_PER_WEEK) return { ...filled, status: 'flat', slopePpPerWeek };
  const daysLeft = Math.ceil((remainingPp / -slope) * 7);
  return { ...filled, status: 'falling', slopePpPerWeek, trendEta: daysLeft > MAX_ETA_DAYS ? null : shiftDateStr(today, daysLeft) };
}
