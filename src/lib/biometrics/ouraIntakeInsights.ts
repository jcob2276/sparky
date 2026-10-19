import type { Tables } from '../database.types';
import type { CaffeineEntry } from '../health/caffeineHistoryApi';
import type { Supplement, SupplementLog } from '../health/supplementsClient';
import { shiftDateStr, warsawTimeOfDay } from '../date';

/** Minimalna liczba nocy po KAŻDEJ stronie porównania, żeby pokazać liczby. */
export const MIN_NIGHTS_PER_GROUP = 5;
/** Różnica wyniku snu (pkt), od której dopiero formułujemy rekomendację. */
const MIN_SCORE_GAP = 3;
/** Progi odstępu (h) między ostatnią kawą a zaśnięciem. */
const GAP_THRESHOLDS_H = [4, 6, 8, 10] as const;

export type IntakeNight = Pick<Tables<'oura_daily_summary'>, 'date' | 'sleep_score' | 'hrv_avg' | 'latency_minutes' | 'bedtime_timestamp'>;

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
  /** Id wpisu z dziś (do cofnięcia) albo null. */
  logId: string | null;
  takenAt: string | null;
  plannedAt: string | null;
}

interface CaffeineGapComparison {
  thresholdHours: number;
  /** withGroup = noce z kawą <= X h przed snem, withoutGroup = noce z kawą > X h przed snem. */
  comparison: IntakeComparison;
}

interface CaffeineGapInsights {
  /** Noce, dla których znamy odstęp ostatnia kawa → zaśnięcie. */
  nightsWithGap: number;
  thresholds: CaffeineGapComparison[];
}

export type CoffeeWindow =
  | { status: 'recommendation'; beforeHours: number; latestClock: string | null; scoreGap: number; nFar: number; nNear: number }
  | { status: 'no_effect' }
  | { status: 'insufficient' };

export interface IntakeInsights {
  todayStack: TodayStackItem[];
  /** Godziny kofeiny dziś (HH:mm). */
  todayCaffeineTimes: string[];
  supplements: SupplementComparison[];
  caffeine: CaffeineGapInsights;
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
        logId: log?.id ?? null,
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

interface GapNight {
  night: IntakeNight;
  gapHours: number;
}

/** Odstęp (h) od ostatniej kawy dnia D do zaśnięcia (bedtime_start nocy D+1); pomija wpisy bez godziny i kawę po zaśnięciu. */
function caffeineGapNights(entries: CaffeineEntry[], byDate: Map<string, IntakeNight>): GapNight[] {
  const lastByDay = new Map<string, number>();
  for (const e of entries) {
    if (!e.loggedAt) continue;
    const ms = new Date(e.loggedAt).getTime();
    if (!Number.isNaN(ms)) lastByDay.set(e.date, Math.max(lastByDay.get(e.date) ?? 0, ms));
  }
  const result: GapNight[] = [];
  for (const [day, ms] of lastByDay) {
    const night = byDate.get(shiftDateStr(day, 1));
    if (!night?.bedtime_timestamp) continue;
    const gapHours = (new Date(night.bedtime_timestamp).getTime() - ms) / 3_600_000;
    if (gapHours >= 0) result.push({ night, gapHours });
  }
  return result;
}

function compareGap(gaps: GapNight[], thresholdHours: number): CaffeineGapComparison {
  const near = gaps.filter((g) => g.gapHours <= thresholdHours).map((g) => g.night);
  const far = gaps.filter((g) => g.gapHours > thresholdHours).map((g) => g.night);
  return { thresholdHours, comparison: compareGroups(near, far) };
}

/** Typowa godzina zaśnięcia (HH:mm), mediana z uwzględnieniem północy. */
function typicalBedtimeMinutes(nights: IntakeNight[]): number | null {
  const minutes = nights.flatMap((n) => {
    if (!n.bedtime_timestamp) return [];
    const m = clockToMinutes(warsawTimeOfDay(n.bedtime_timestamp));
    return [m < 12 * 60 ? m + 1440 : m];
  });
  return median(minutes);
}

function recommendWindow(thresholds: CaffeineGapComparison[], nights: IntakeNight[]): CoffeeWindow {
  let best: Extract<CoffeeWindow, { status: 'recommendation' }> | null = null;
  let anyTestable = false;
  for (const { thresholdHours, comparison } of thresholds) {
    if (comparison.status !== 'ok') continue;
    anyTestable = true;
    const { withGroup: near, withoutGroup: far } = comparison;
    if (near.sleepScore == null || far.sleepScore == null) continue;
    const gap = Math.round((far.sleepScore - near.sleepScore) * 10) / 10;
    if (gap >= MIN_SCORE_GAP && (!best || gap > best.scoreGap)) {
      const bed = typicalBedtimeMinutes(nights);
      best = {
        status: 'recommendation',
        beforeHours: thresholdHours,
        latestClock: bed == null ? null : minutesToClock(((bed - thresholdHours * 60) % 1440 + 1440) % 1440),
        scoreGap: gap,
        nFar: far.n,
        nNear: near.n,
      };
    }
  }
  if (best) return best;
  return anyTestable ? { status: 'no_effect' } : { status: 'insufficient' };
}

export function buildIntakeInsights(input: IntakeInput): IntakeInsights {
  const byDate = new Map(input.nights.map((n) => [n.date, n]));
  const gaps = caffeineGapNights(input.caffeineEntries, byDate);
  const thresholds = GAP_THRESHOLDS_H.map((h) => compareGap(gaps, h));
  return {
    todayStack: buildTodayStack(input.supplements, input.supplementLogs, input.today),
    todayCaffeineTimes: input.caffeineEntries.flatMap((e) =>
      e.date === input.today && e.loggedAt ? [warsawTimeOfDay(e.loggedAt)] : [],
    ),
    supplements: input.supplements.flatMap((s) => {
      const c = compareSupplement(s, input.supplementLogs, input.nights, byDate);
      return c ? [c] : [];
    }),
    caffeine: { nightsWithGap: gaps.length, thresholds },
    coffeeWindow: recommendWindow(thresholds, input.nights),
  };
}
