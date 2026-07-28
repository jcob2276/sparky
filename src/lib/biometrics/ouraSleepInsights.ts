export interface OuraSleepInsightDay {
  date: string;
  bedtime_start: string | null;
  bedtime_end: string | null;
  total_sleep_hours: number | null;
  readiness_contributors: unknown;
  readiness_score?: number | null;
  sleep_score?: number | null;
}

export interface OuraSleepLedgerEntry {
  date: string;
  sleptMinutes: number;
  deltaMinutes: number;
}

export interface OuraSleepInsights {
  circadianOffsetMinutes: number | null;
  circadianStatus: 'Zgodny' | 'Lekko przesunięty' | 'Przesunięty' | null;
  circadianConfidence: 'calibrating' | 'building' | 'solid';
  circadianVariabilityMinutes: number | null;
  regularityScore: number | null;
  sleepDebtDays: number;
  sleepDebtMinutes: number | null;
  sleepBalanceMinutes: number | null;
  sleepLedger: OuraSleepLedgerEntry[];
  personalNeedMinutes: number;
  personalNeedSource: 'personal' | 'typical';
  totalNeededMinutes: number | null;
  totalSleptMinutes: number | null;
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
  return ((a - b + 720) % 1440) - 720;
}

function measuredRegularity(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const score = (value as Record<string, unknown>).sleep_regularity;
  return typeof score === 'number' ? Math.round(score) : null;
}

function quantile(values: number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const remainder = position - lower;
  return sorted[lower + 1] == null
    ? sorted[lower]
    : sorted[lower] + remainder * (sorted[lower + 1] - sorted[lower]);
}

function dateDaysBefore(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function personalSleepNeed(history: OuraSleepInsightDay[], currentDate: string) {
  const startDate = dateDaysBefore(currentDate, 89);
  const sleepHistory = history
    .filter((day) => (
      day.date >= startDate
      && day.date <= currentDate
      && day.total_sleep_hours != null
      && day.total_sleep_hours >= 3
      && day.total_sleep_hours <= 11
    ))
    .map((day) => Math.round((day.total_sleep_hours ?? 0) * 60));
  const measuredNeed = sleepHistory.length >= 30 ? quantile(sleepHistory, 0.8) : null;
  return measuredNeed == null
    ? { minutes: 480, source: 'typical' as const }
    : {
      minutes: Math.max(420, Math.min(540, Math.round(measuredNeed))),
      source: 'personal' as const,
    };
}

export function buildOuraSleepInsights(
  current: OuraSleepInsightDay | null,
  history: OuraSleepInsightDay[],
  aggregateSleepHistory: OuraSleepInsightDay[] = history,
): OuraSleepInsights {
  if (!current) {
    return {
      circadianOffsetMinutes: null,
      circadianStatus: null,
      circadianConfidence: 'calibrating',
      circadianVariabilityMinutes: null,
      regularityScore: null,
      sleepDebtDays: 0,
      sleepDebtMinutes: null,
      sleepBalanceMinutes: null,
      sleepLedger: [],
      personalNeedMinutes: 480,
      personalNeedSource: 'typical',
      totalNeededMinutes: null,
      totalSleptMinutes: null,
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
  const observedMidpointCount = priorMidpoints.length + (currentMidpoint == null ? 0 : 1);
  const variability = baselineMidpoint == null
    ? null
    : median(priorMidpoints.map(
      (value) => Math.abs(circularDifference(value, baselineMidpoint)),
    ));
  const datedHistory = aggregateSleepHistory.filter((day) => day.date <= current.date);
  const need = personalSleepNeed(datedHistory, current.date);
  const debtStartDate = dateDaysBefore(current.date, 13);
  const debtWindow = datedHistory
    .filter((day) => day.date >= debtStartDate)
    .filter((day) => day.total_sleep_hours != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const sleepLedger = debtWindow.map((day) => {
    const sleptMinutes = Math.round((day.total_sleep_hours ?? 0) * 60);
    return {
      date: day.date,
      sleptMinutes,
      deltaMinutes: sleptMinutes - need.minutes,
    };
  });
  const sleepBalance = sleepLedger.length === 0
    ? null
    : sleepLedger.reduce((sum, entry) => sum + entry.deltaMinutes, 0);

  return {
    circadianOffsetMinutes: offset,
    circadianStatus: absoluteOffset == null
      ? null
      : absoluteOffset <= 30
        ? 'Zgodny'
        : absoluteOffset <= 60 ? 'Lekko przesunięty' : 'Przesunięty',
    circadianConfidence: observedMidpointCount >= 14
      ? 'solid'
      : observedMidpointCount >= 7 ? 'building' : 'calibrating',
    circadianVariabilityMinutes: variability == null ? null : Math.round(variability),
    regularityScore: measuredRegularity(current.readiness_contributors),
    sleepDebtDays: debtWindow.length,
    sleepDebtMinutes: sleepBalance == null ? null : Math.max(0, -sleepBalance),
    sleepBalanceMinutes: sleepBalance,
    sleepLedger,
    personalNeedMinutes: need.minutes,
    personalNeedSource: need.source,
    totalNeededMinutes: sleepLedger.length === 0 ? null : sleepLedger.length * need.minutes,
    totalSleptMinutes: sleepLedger.length === 0
      ? null
      : sleepLedger.reduce((sum, entry) => sum + entry.sleptMinutes, 0),
  };
}
