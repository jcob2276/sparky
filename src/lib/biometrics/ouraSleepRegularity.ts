import { shiftDateStr, warsawTimeOfDay } from '../date';

/**
 * Sleep regularity over the last 14 nights. Pure functions, no React / Supabase.
 *
 * Time axis: minutes since 18:00 Warsaw time ("axis minutes"), so a bedtime of 01:03 is 423 (late evening of the
 * same night), never "morning". Wake time = bedtime axis + time in bed, so it can exceed 720 but never wraps.
 */

const REGULARITY_WINDOW_NIGHTS = 14;
const REGULARITY_MIN_NIGHTS = 7;
/** Nights whose bedtime is within this many minutes of the median count as "consistent". */
export const CONSISTENCY_TOLERANCE_MIN = 45;
/** Personal sleep target = median of up to this many nights; below the minimum we fall back to the default. */
export const TARGET_WINDOW_NIGHTS = 60;
const TARGET_MIN_NIGHTS = 14;
const DEFAULT_TARGET_MIN = 8 * 60;

const AXIS_ORIGIN_MIN = 18 * 60;
const MINUTES_PER_DAY = 24 * 60;
const MAX_IN_BED_MIN = 16 * 60;

export interface SleepRegularityRow {
  date: string;
  bedtime_start: string | null;
  bedtime_end: string | null;
  total_sleep_hours: number | null;
}

export interface RegularityNight {
  /** Date of the morning the night ended on (YYYY-MM-DD, Warsaw) – the `date` column of oura_enhanced. */
  date: string;
  weekday: string;
  bedtimeAxis: number;
  wakeAxis: number;
  sleepMinutes: number;
  withinTolerance: boolean;
  isLatest: boolean;
}

export interface SleepRegularity {
  status: 'ready' | 'insufficient';
  /** Valid nights inside the 14-night window, oldest first. */
  nights: RegularityNight[];
  needed: number;
  windowStart: string;
  windowEnd: string;
  medianBedtimeAxis: number | null;
  medianWakeAxis: number | null;
  bedtimeStdMin: number | null;
  wakeStdMin: number | null;
  nightsWithinTolerance: number | null;
  /** Share of nights (0-100) within +-45 min of the median bedtime. */
  consistencyPct: number | null;
  targetMinutes: number;
  targetSource: 'personal' | 'default';
  /** Sum over measured nights of max(0, target - actual sleep); surplus nights do not pay it back. */
  sleepDebtMinutes: number | null;
}

const WEEKDAY_SHORT: Record<string, string> = {
  poniedziałek: 'pn', wtorek: 'wt', środa: 'śr', czwartek: 'cz', piątek: 'pt', sobota: 'sb', niedziela: 'nd',
};

function weekdayShort(date: string): string {
  const long = new Date(`${date}T12:00:00Z`)
    .toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'long' });
  return WEEKDAY_SHORT[long] ?? long.slice(0, 2);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Population standard deviation. */
function stdDev(values: number[]): number | null {
  if (values.length === 0) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

/** Warsaw wall-clock time of an ISO timestamp as minutes since 18:00 (0..1439). */
function toAxisMinutes(iso: string): number {
  const [hours, minutes] = warsawTimeOfDay(iso).split(':').map(Number);
  return (((hours % 24) * 60 + minutes - AXIS_ORIGIN_MIN) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Axis minutes back to "HH:MM" wall-clock time. */
export function formatAxisClock(axisMinutes: number): string {
  const total = (((Math.round(axisMinutes) + AXIS_ORIGIN_MIN) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** 395 -> "6 h 35 min". */
export function formatDuration(minutes: number): string {
  const rounded = Math.round(Math.abs(minutes));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

interface ValidNight {
  date: string;
  bedtimeAxis: number;
  wakeAxis: number;
  sleepMinutes: number;
}

function parseRow(row: SleepRegularityRow): ValidNight | null {
  if (!row.bedtime_start || !row.bedtime_end || row.total_sleep_hours == null || row.total_sleep_hours <= 0) return null;
  const startMs = Date.parse(row.bedtime_start);
  const endMs = Date.parse(row.bedtime_end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const inBed = Math.round((endMs - startMs) / 60_000);
  if (inBed > MAX_IN_BED_MIN) return null;
  const bedtimeAxis = toAxisMinutes(row.bedtime_start);
  return {
    date: row.date,
    bedtimeAxis,
    wakeAxis: bedtimeAxis + inBed,
    sleepMinutes: Math.round(row.total_sleep_hours * 60),
  };
}

/**
 * @param rows oura_enhanced rows (any order, up to ~60 days back)
 * @param todayDate Warsaw date (YYYY-MM-DD); the window is the 14 calendar days ending on it
 */
export function buildSleepRegularity(rows: SleepRegularityRow[], todayDate: string): SleepRegularity {
  const windowStart = shiftDateStr(todayDate, -(REGULARITY_WINDOW_NIGHTS - 1));
  const targetStart = shiftDateStr(todayDate, -(TARGET_WINDOW_NIGHTS - 1));
  const valid = rows
    .map(parseRow)
    .filter((n): n is ValidNight => n !== null && n.date >= targetStart && n.date <= todayDate);
  const inWindow = valid
    .filter((n) => n.date >= windowStart)
    .sort((a, b) => a.date.localeCompare(b.date));

  const targetPool = valid.map((n) => n.sleepMinutes);
  const personal = targetPool.length >= TARGET_MIN_NIGHTS;
  const targetMinutes = personal ? Math.round(median(targetPool) ?? DEFAULT_TARGET_MIN) : DEFAULT_TARGET_MIN;
  const base = {
    needed: REGULARITY_MIN_NIGHTS,
    windowStart,
    windowEnd: todayDate,
    targetMinutes,
    targetSource: personal ? ('personal' as const) : ('default' as const),
  };

  const medianBedtime = median(inWindow.map((n) => n.bedtimeAxis));
  const medianWake = median(inWindow.map((n) => n.wakeAxis));
  const latestDate = inWindow.at(-1)?.date;
  const nights: RegularityNight[] = inWindow.map((n) => ({
    ...n,
    weekday: weekdayShort(n.date),
    withinTolerance: medianBedtime !== null && Math.abs(n.bedtimeAxis - medianBedtime) <= CONSISTENCY_TOLERANCE_MIN,
    isLatest: n.date === latestDate,
  }));

  if (nights.length < REGULARITY_MIN_NIGHTS || medianBedtime === null || medianWake === null) {
    return {
      ...base, status: 'insufficient', nights,
      medianBedtimeAxis: null, medianWakeAxis: null, bedtimeStdMin: null, wakeStdMin: null,
      nightsWithinTolerance: null, consistencyPct: null, sleepDebtMinutes: null,
    };
  }

  const within = nights.filter((n) => n.withinTolerance).length;
  return {
    ...base,
    status: 'ready',
    nights,
    medianBedtimeAxis: medianBedtime,
    medianWakeAxis: medianWake,
    bedtimeStdMin: Math.round(stdDev(nights.map((n) => n.bedtimeAxis)) ?? 0),
    wakeStdMin: Math.round(stdDev(nights.map((n) => n.wakeAxis)) ?? 0),
    nightsWithinTolerance: within,
    consistencyPct: Math.round((within / nights.length) * 100),
    sleepDebtMinutes: nights.reduce((sum, n) => sum + Math.max(0, targetMinutes - n.sleepMinutes), 0),
  };
}
