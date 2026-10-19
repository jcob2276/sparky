import type { Tables } from '../database.types';
import type { CaffeineEntry } from '../health/caffeineHistoryApi';
import type { Supplement, SupplementLog } from '../health/supplementsClient';
import { shiftDateStr, warsawTimeOfDay } from '../date';

/** Minimalna liczba nocy po KAŻDEJ stronie porównania, żeby pokazać liczby. */
export const MIN_NIGHTS_PER_GROUP = 5;
/** Różnica wyniku snu (pkt), od której dopiero formułujemy rekomendację. */
const MIN_SCORE_GAP = 3;
const DEFAULT_CAFFEINE_CUTOFF_HOUR = 14;
const CUTOFF_CANDIDATES = [12, 13, 14, 15, 16, 17] as const;

export type IntakeNight = Pick<Tables<'oura_daily_summary'>, 'date' | 'sleep_score' | 'hrv_avg' | 'latency_minutes'>;

export interface NightGroup {
  /** Liczba nocy z wynikiem snu w grupie. */
  n: number;
  sleepScore: number | null;
  hrv: number | null;
  latencyMin: number | null;
}

export type IntakeComparison =
  | { status: 'ok'; withGroup: NightGroup; withoutGroup: NightGroup }
  | { status: 'insufficient'; nWith: number; nWithout: number };

interface SupplementComparison {
  id: string;
  name: string;
  /** Mediana godziny zażycia (HH:mm) albo null. */
  typicalTime: string | null;
  comparison: IntakeComparison;
}

export interface TodayStackItem {
  id: string;
  name: string;
  taken: boolean;
  takenAt: string | null;
  plannedAt: string | null;
}

interface CaffeineComparison {
  cutoffHour: number;
  /** Dni z godzinną kofeiną (z nich budujemy porównanie). */
  daysWithTimedCaffeine: number;
  /** withGroup = noce po dniach z późną kawą, withoutGroup = po dniach z kawą wcześnie. */
  comparison: IntakeComparison;
}

export type CoffeeWindow =
  | { status: 'recommendation'; beforeHour: number; scoreGap: number; nEarly: number; nLate: number }
  | { status: 'no_effect' }
  | { status: 'insufficient' };

export interface IntakeInsights {
  todayStack: TodayStackItem[];
  /** Godziny kofeiny dziś (HH:mm). */
  todayCaffeineTimes: string[];
  supplements: SupplementComparison[];
  caffeine: CaffeineComparison;
  coffeeWindow: CoffeeWindow;
}

export interface IntakeInput {
  today: string;
  nights: IntakeNight[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  caffeineEntries: CaffeineEntry[];
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return Math.round((present.reduce((s, v) => s + v, 0) / present.length) * 10) / 10;
}

function toGroup(nights: IntakeNight[]): NightGroup {
  const scored = nights.filter((n) => n.sleep_score != null);
  return {
    n: scored.length,
    sleepScore: average(scored.map((n) => n.sleep_score)),
    hrv: average(scored.map((n) => n.hrv_avg)),
    latencyMin: average(scored.map((n) => n.latency_minutes)),
  };
}

function compareGroups(withNights: IntakeNight[], withoutNights: IntakeNight[]): IntakeComparison {
  const withGroup = toGroup(withNights);
  const withoutGroup = toGroup(withoutNights);
  if (withGroup.n < MIN_NIGHTS_PER_GROUP || withoutGroup.n < MIN_NIGHTS_PER_GROUP) {
    return { status: 'insufficient', nWith: withGroup.n, nWithout: withoutGroup.n };
  }
  return { status: 'ok', withGroup, withoutGroup };
}

function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, '0')}:${String(Math.round(minutes % 60)).padStart(2, '0')}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Noc, która kończy się rano dnia następnego po dniu `day`, ma w Oura datę day+1. */
function nightsAfterDays(days: Iterable<string>, byDate: Map<string, IntakeNight>): IntakeNight[] {
  const result: IntakeNight[] = [];
  for (const day of days) {
    const night = byDate.get(shiftDateStr(day, 1));
    if (night) result.push(night);
  }
  return result;
}

function isScheduled(s: Supplement, today: string): boolean {
  if (!s.active) return false;
  if (s.start_date && s.start_date > today) return false;
  if (s.end_date && s.end_date < today) return false;
  return true;
}

function buildTodayStack(supplements: Supplement[], logs: SupplementLog[], today: string): TodayStackItem[] {
  return supplements
    .filter((s) => isScheduled(s, today))
    .map((s) => {
      const log = logs.find((l) => l.supplement_id === s.id && l.date === today);
      return {
        id: s.id,
        name: s.name,
        taken: !!log,
        takenAt: log?.logged_at ? warsawTimeOfDay(log.logged_at) : null,
        plannedAt: s.reminder_time ? s.reminder_time.slice(0, 5) : null,
      };
    });
}

function compareSupplement(
  s: Supplement,
  logs: SupplementLog[],
  nights: IntakeNight[],
  byDate: Map<string, IntakeNight>,
): SupplementComparison | null {
  const own = logs.filter((l) => l.supplement_id === s.id);
  if (own.length === 0) return null;
  const takenDays = new Set(own.map((l) => l.date));
  const firstDay = [...takenDays].sort()[0];
  // Dni "bez" liczymy dopiero od pierwszego zażycia, żeby nie mieszać okresu sprzed suplementacji.
  const lastNight = nights.reduce((max, n) => (n.date > max ? n.date : max), firstDay);
  const withoutDays: string[] = [];
  for (let d = firstDay; shiftDateStr(d, 1) <= lastNight; d = shiftDateStr(d, 1)) {
    if (!takenDays.has(d)) withoutDays.push(d);
  }
  const times = own.flatMap((l) => (l.logged_at ? [clockToMinutes(warsawTimeOfDay(l.logged_at))] : []));
  const typical = median(times);
  return {
    id: s.id,
    name: s.name,
    typicalTime: typical == null ? null : minutesToClock(typical),
    comparison: compareGroups(nightsAfterDays(takenDays, byDate), nightsAfterDays(withoutDays, byDate)),
  };
}

/** Dla każdego dnia z godzinną kofeiną: godzina ostatniej dawki (ułamek godziny, Warsaw). */
function lastCaffeineHourByDay(entries: CaffeineEntry[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const e of entries) {
    if (!e.loggedAt) continue;
    const hour = clockToMinutes(warsawTimeOfDay(e.loggedAt)) / 60;
    result.set(e.date, Math.max(result.get(e.date) ?? 0, hour));
  }
  return result;
}

function compareCaffeine(
  lastHours: Map<string, number>,
  byDate: Map<string, IntakeNight>,
  cutoffHour: number,
): CaffeineComparison {
  const lateDays: string[] = [];
  const earlyDays: string[] = [];
  for (const [day, hour] of lastHours) (hour >= cutoffHour ? lateDays : earlyDays).push(day);
  return {
    cutoffHour,
    daysWithTimedCaffeine: lastHours.size,
    comparison: compareGroups(nightsAfterDays(lateDays, byDate), nightsAfterDays(earlyDays, byDate)),
  };
}

function recommendWindow(lastHours: Map<string, number>, byDate: Map<string, IntakeNight>): CoffeeWindow {
  let best: Extract<CoffeeWindow, { status: 'recommendation' }> | null = null;
  let anyTestable = false;
  for (const cutoff of CUTOFF_CANDIDATES) {
    const { comparison } = compareCaffeine(lastHours, byDate, cutoff);
    if (comparison.status !== 'ok') continue;
    anyTestable = true;
    const { withGroup: late, withoutGroup: early } = comparison;
    if (late.sleepScore == null || early.sleepScore == null) continue;
    const gap = Math.round((early.sleepScore - late.sleepScore) * 10) / 10;
    if (gap >= MIN_SCORE_GAP && (!best || gap > best.scoreGap)) {
      best = { status: 'recommendation', beforeHour: cutoff, scoreGap: gap, nEarly: early.n, nLate: late.n };
    }
  }
  if (best) return best;
  return anyTestable ? { status: 'no_effect' } : { status: 'insufficient' };
}

export function buildIntakeInsights(input: IntakeInput): IntakeInsights {
  const byDate = new Map(input.nights.map((n) => [n.date, n]));
  const lastHours = lastCaffeineHourByDay(input.caffeineEntries);
  return {
    todayStack: buildTodayStack(input.supplements, input.supplementLogs, input.today),
    todayCaffeineTimes: input.caffeineEntries.flatMap((e) =>
      e.date === input.today && e.loggedAt ? [warsawTimeOfDay(e.loggedAt)] : [],
    ),
    supplements: input.supplements.flatMap((s) => {
      const c = compareSupplement(s, input.supplementLogs, input.nights, byDate);
      return c ? [c] : [];
    }),
    caffeine: compareCaffeine(lastHours, byDate, DEFAULT_CAFFEINE_CUTOFF_HOUR),
    coffeeWindow: recommendWindow(lastHours, byDate),
  };
}
