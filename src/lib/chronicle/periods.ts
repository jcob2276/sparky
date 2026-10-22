import { getTodayWarsaw, getWeekStartWarsaw, shiftDateStr } from '../date';
import { getSprintInfo } from '../growth/sprintUtils';

export type ChroniclePeriod = 'week' | 'month' | 'sprint' | 'year';

export const PERIOD_LABELS: Record<ChroniclePeriod, string> = {
  week: 'Tydzień',
  month: 'Miesiąc',
  sprint: 'Sprint',
  year: 'Rok',
};

interface Bucket {
  label: string;
  start: string;
  end: string;
}

export interface PeriodWindow {
  period: ChroniclePeriod;
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  buckets: Bucket[];
  /** Długość okna w tygodniach (do skalowania tygodniowych celów). */
  weeks: number;
  title: string;
}

type SprintBounds = Pick<ReturnType<typeof getSprintInfo>, 'sprintStart' | 'sprintEnd' | 'prevStart' | 'prevEnd' | 'sprintNumber'>;

const DAYS = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'];
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const pad = (n: number) => String(n).padStart(2, '0');

function lastDayOfMonth(year: number, month: number): string {
  return `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}

function weeklyBuckets(start: string, end: string): Bucket[] {
  const count = Math.ceil((daysBetween(start, end) + 1) / 7);
  return Array.from({ length: count }, (_, i) => {
    const from = shiftDateStr(start, i * 7);
    const to = shiftDateStr(from, 6);
    return { label: String(i + 1), start: from, end: to > end ? end : to };
  });
}

function monthBuckets(year: number): Bucket[] {
  return MONTHS.map((label, i) => ({ label, start: `${year}-${pad(i + 1)}-01`, end: lastDayOfMonth(year, i + 1) }));
}

/** Okno wybranego okresu, poprzednie okno tej samej długości i kubełki do wykresu. */
export function buildPeriodWindow(
  period: ChroniclePeriod,
  today: string = getTodayWarsaw(),
  sprint: SprintBounds = getSprintInfo(),
): PeriodWindow {
  if (period === 'week') {
    const start = getWeekStartWarsaw(today);
    const end = shiftDateStr(start, 6);
    return {
      period, start, end,
      prevStart: shiftDateStr(start, -7), prevEnd: shiftDateStr(start, -1),
      buckets: DAYS.map((label, i) => ({ label, start: shiftDateStr(start, i), end: shiftDateStr(start, i) })),
      weeks: 1, title: 'Ten tydzień',
    };
  }
  if (period === 'month') {
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    const start = `${year}-${pad(month)}-01`;
    const end = lastDayOfMonth(year, month);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    return {
      period, start, end,
      prevStart: `${prevYear}-${pad(prevMonth)}-01`, prevEnd: lastDayOfMonth(prevYear, prevMonth),
      buckets: weeklyBuckets(start, end),
      weeks: Math.round(((daysBetween(start, end) + 1) / 7) * 10) / 10, title: 'Ten miesiąc',
    };
  }
  if (period === 'sprint') {
    const start = sprint.sprintStart;
    const end = sprint.sprintEnd;
    return {
      period, start, end,
      prevStart: sprint.prevStart ?? shiftDateStr(start, -84), prevEnd: sprint.prevEnd ?? shiftDateStr(start, -1),
      buckets: weeklyBuckets(start, end),
      weeks: 12, title: `Sprint ${sprint.sprintNumber}`,
    };
  }
  const year = Number(today.slice(0, 4));
  return {
    period, start: `${year}-01-01`, end: `${year}-12-31`,
    prevStart: `${year - 1}-01-01`, prevEnd: `${year - 1}-12-31`,
    buckets: monthBuckets(year),
    weeks: 52, title: String(year),
  };
}
