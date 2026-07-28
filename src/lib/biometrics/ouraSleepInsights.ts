export interface OuraSleepInsightDay {
  date: string;
  bedtime_start: string | null;
  bedtime_end: string | null;
  total_sleep_hours: number | null;
  readiness_contributors: unknown;
}

export interface OuraSleepInsights {
  circadianOffsetMinutes: number | null;
  circadianStatus: 'Zgodny' | 'Lekko przesunięty' | 'Przesunięty' | null;
  regularityScore: number | null;
  sleepDebtDays: number;
  sleepDebtMinutes: number | null;
}

const WARSAW_TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  timeZone: 'Europe/Warsaw',
});

function midpointMinutes(day: OuraSleepInsightDay): number | null {
  if (!day.bedtime_start || !day.bedtime_end) return null;
  const start = new Date(day.bedtime_start).getTime();
  const end = new Date(day.bedtime_end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const parts = WARSAW_TIME.formatToParts(new Date((start + end) / 2));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return Number.isFinite(hour + minute) ? (hour % 24) * 60 + minute : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function circularDifference(a: number, b: number): number {
  const raw = a - b;
  return ((raw + 720) % 1440) - 720;
}

function regularityScore(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const score = (value as Record<string, unknown>).sleep_regularity;
  return typeof score === 'number' ? Math.round(score) : null;
}

export function buildOuraSleepInsights(
  current: OuraSleepInsightDay | null,
  history: OuraSleepInsightDay[],
): OuraSleepInsights {
  if (!current) {
    return {
      circadianOffsetMinutes: null,
      circadianStatus: null,
      regularityScore: null,
      sleepDebtDays: 0,
      sleepDebtMinutes: null,
    };
  }

  const currentMidpoint = midpointMinutes(current);
  const priorMidpoints = history
    .filter((day) => day.date < current.date)
    .slice(-14)
    .map(midpointMinutes)
    .filter((value): value is number => value != null);
  const baselineMidpoint = median(priorMidpoints);
  const offset = currentMidpoint == null || baselineMidpoint == null
    ? null
    : Math.round(circularDifference(currentMidpoint, baselineMidpoint));
  const absoluteOffset = offset == null ? null : Math.abs(offset);
  const debtWindow = history
    .filter((day) => day.date <= current.date && day.total_sleep_hours != null)
    .slice(-7);
  const debt = debtWindow.length === 0
    ? null
    : Math.round(debtWindow.reduce(
      (sum, day) => sum + Math.max(0, 8 - (day.total_sleep_hours ?? 8)) * 60,
      0,
    ));

  return {
    circadianOffsetMinutes: offset,
    circadianStatus: absoluteOffset == null
      ? null
      : absoluteOffset <= 30
        ? 'Zgodny'
        : absoluteOffset <= 60 ? 'Lekko przesunięty' : 'Przesunięty',
    regularityScore: regularityScore(current.readiness_contributors),
    sleepDebtDays: debtWindow.length,
    sleepDebtMinutes: debt,
  };
}
