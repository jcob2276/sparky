import { estimateCaffeineMg } from '@vanguard/domain';
import { combineDateTimeWarsawISO, shiftDateStr } from '../date';
import { STAGES, type SleepStage } from './ouraSleepTimeline';
import type {
  DayNightTimeline,
  DayTimelineMarker,
  DayTimelinePoint,
  DayTimelineSleepSegment,
} from './ouraDayTimeline.types';

/** Same half-life as ouraContextInsights (resolveCaffeineInsights) so both views agree. */
const CAFFEINE_HALF_LIFE_H = 5.5;
const CAFFEINE_STEP_MS = 15 * 60_000;
const PHASE_BLOCK_MS = 5 * 60_000;
const MAX_SERIES_POINTS = 200;
const HOUR_MS = 3_600_000;

interface RawPhasePoint { ts: string; phase: string | null; phase_code: number | null }
interface RawHrPoint { ts: string; bpm: number | null }
interface RawHrvPoint { ts: string; hrv: number | null }
interface RawFoodEntry {
  id: string;
  name: string;
  calories: number | null;
  logged_at: string | null;
  meal_group_id: string | null;
}
interface RawSupplementLog { id: string; logged_at: string; quantity: number; name: string | null }
interface RawStravaActivity {
  strava_id: number | null;
  name: string | null;
  sport_type: string | null;
  start_date: string | null;
  moving_time: number | null;
  elapsed_time: number | null;
}
interface RawWorkoutSession {
  id: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
}

export interface DayNightRaw {
  /** Wake-up date, YYYY-MM-DD (Europe/Warsaw). */
  nightDate: string;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  phases: RawPhasePoint[];
  heartRate: RawHrPoint[];
  hrv: RawHrvPoint[];
  foodEntries: RawFoodEntry[];
  supplementLogs: RawSupplementLog[];
  stravaActivities: RawStravaActivity[];
  workoutSessions: RawWorkoutSession[];
}

const toMs = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : Number.NaN);
const iso = (ms: number): string => new Date(ms).toISOString();

function stageOf(point: RawPhasePoint): SleepStage | null {
  if (point.phase_code != null) return STAGES[String(point.phase_code)] ?? null;
  const named = point.phase?.toLowerCase();
  return named === 'deep' || named === 'light' || named === 'rem' || named === 'awake' ? named : null;
}

function buildSegments(
  phases: RawPhasePoint[],
  fromMs: number | null,
  toMsLimit: number | null,
): DayTimelineSleepSegment[] {
  const blocks = phases
    .map((p) => ({ stage: stageOf(p), start: toMs(p.ts) }))
    .filter((b): b is { stage: SleepStage; start: number } => b.stage != null && Number.isFinite(b.start))
    .sort((a, b) => a.start - b.start);
  const segments: Array<{ stage: SleepStage; start: number; end: number }> = [];
  for (const block of blocks) {
    const start = fromMs != null ? Math.max(block.start, fromMs) : block.start;
    const end = toMsLimit != null ? Math.min(block.start + PHASE_BLOCK_MS, toMsLimit) : block.start + PHASE_BLOCK_MS;
    if (end <= start) continue;
    const prev = segments.at(-1);
    if (prev && prev.stage === block.stage && prev.end === start) prev.end = end;
    else segments.push({ stage: block.stage, start, end });
  }
  return segments.map((s) => ({ stage: s.stage, start: iso(s.start), end: iso(s.end) }));
}

/** Averages consecutive chunks so the series has at most `max` points. */
function downsample(points: DayTimelinePoint[], max = MAX_SERIES_POINTS): DayTimelinePoint[] {
  if (points.length <= max) return points;
  const size = points.length / max;
  const out: DayTimelinePoint[] = [];
  for (let i = 0; i < max; i += 1) {
    const chunk = points.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (chunk.length === 0) continue;
    const mean = chunk.reduce((sum, p) => sum + p.value, 0) / chunk.length;
    out.push({ at: chunk[0].at, value: Math.round(mean * 10) / 10 });
  }
  return out;
}

function toSeries<T extends { ts: string }>(
  rows: T[],
  read: (row: T) => number | null,
  fromMs: number | null,
  toMsLimit: number | null,
): DayTimelinePoint[] {
  const points: Array<{ ms: number; value: number }> = [];
  for (const row of rows) {
    const ms = toMs(row.ts);
    const value = read(row);
    if (!Number.isFinite(ms) || value == null || !(value > 0)) continue;
    if ((fromMs != null && ms < fromMs) || (toMsLimit != null && ms > toMsLimit)) continue;
    points.push({ ms, value });
  }
  points.sort((a, b) => a.ms - b.ms);
  return downsample(points.map((p) => ({ at: iso(p.ms), value: p.value })));
}

interface CaffeineDose { at: number; mg: number }

function caffeineAt(doses: CaffeineDose[], atMs: number): number {
  let sum = 0;
  for (const dose of doses) {
    if (dose.at > atMs) continue;
    sum += dose.mg * Math.pow(0.5, (atMs - dose.at) / HOUR_MS / CAFFEINE_HALF_LIFE_H);
  }
  return sum;
}

function buildCaffeineCurve(doses: CaffeineDose[], startMs: number, endMs: number): DayTimelinePoint[] {
  if (doses.length === 0) return [];
  const curve: DayTimelinePoint[] = [];
  for (let t = startMs; t <= endMs; t += CAFFEINE_STEP_MS) {
    curve.push({ at: iso(t), value: Math.round(caffeineAt(doses, t)) });
  }
  return curve;
}

function buildMealMarkers(entries: RawFoodEntry[]): DayTimelineMarker[] {
  const groups = new Map<string, RawFoodEntry[]>();
  for (const entry of entries) {
    if (!entry.logged_at) continue;
    const key = entry.meal_group_id ?? `t:${entry.logged_at}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.entries()].map(([key, items]) => {
    const kcal = Math.round(items.reduce((sum, e) => sum + (e.calories ?? 0), 0));
    const parts = [items.length > 1 ? `${items.length} ${items.length < 5 ? 'pozycje' : 'pozycji'}` : null, kcal > 0 ? `${kcal} kcal` : null];
    return {
      id: `meal:${key}`,
      kind: 'meal' as const,
      at: iso(Math.min(...items.map((e) => toMs(e.logged_at)))),
      label: items[0].name,
      detail: parts.filter(Boolean).join(' · ') || undefined,
    };
  });
}

function buildWorkoutMarkers(raw: DayNightRaw): DayTimelineMarker[] {
  const markers: DayTimelineMarker[] = [];
  const spans: Array<{ start: number; end: number }> = [];
  for (const a of raw.stravaActivities) {
    const start = toMs(a.start_date);
    if (!Number.isFinite(start)) continue;
    const seconds = a.moving_time ?? a.elapsed_time ?? 0;
    spans.push({ start, end: start + (a.elapsed_time ?? seconds) * 1000 });
    markers.push({
      id: `workout:strava:${a.strava_id ?? a.start_date}`,
      kind: 'workout',
      at: iso(start),
      label: a.name || a.sport_type || 'Trening',
      detail: seconds > 0 ? `${Math.round(seconds / 60)} min` : undefined,
    });
  }
  for (const s of raw.workoutSessions) {
    const start = toMs(s.start_time);
    if (!Number.isFinite(start)) continue;
    const endRaw = toMs(s.end_time);
    const end = Number.isFinite(endRaw) ? endRaw : start + (s.duration_minutes ?? 0) * 60_000;
    // The same effort is often mirrored in Strava; keep one marker.
    if (spans.some((span) => start < span.end && end > span.start)) continue;
    markers.push({
      id: `workout:session:${s.id}`,
      kind: 'workout',
      at: iso(start),
      label: 'Trening siłowy',
      detail: s.duration_minutes ? `${Math.round(s.duration_minutes)} min` : undefined,
    });
  }
  return markers;
}

export function buildDayNightTimeline(raw: DayNightRaw): DayNightTimeline {
  const windowStartMs = Date.parse(combineDateTimeWarsawISO(shiftDateStr(raw.nightDate, -1), '06:00'));

  const phaseTimes = raw.phases.map((p) => toMs(p.ts)).filter(Number.isFinite);
  const bedStartRaw = toMs(raw.bedtimeStart);
  const bedEndRaw = toMs(raw.bedtimeEnd);
  const hasBedtimes = Number.isFinite(bedStartRaw) && Number.isFinite(bedEndRaw) && bedEndRaw > bedStartRaw;
  let sleepStartMs: number | null = null;
  let sleepEndMs: number | null = null;
  if (hasBedtimes) {
    sleepStartMs = bedStartRaw;
    sleepEndMs = bedEndRaw;
  } else if (phaseTimes.length > 0) {
    sleepStartMs = Math.min(...phaseTimes);
    sleepEndMs = Math.max(...phaseTimes) + PHASE_BLOCK_MS;
  }

  const fallbackEndMs = Date.parse(combineDateTimeWarsawISO(raw.nightDate, '10:00'));
  const windowEndMs = sleepEndMs != null && sleepEndMs > windowStartMs ? sleepEndMs : fallbackEndMs;
  const inWindow = (ms: number) => Number.isFinite(ms) && ms >= windowStartMs && ms <= windowEndMs;

  const caffeineEntries = raw.foodEntries
    .map((e) => ({ entry: e, mg: estimateCaffeineMg(e.name), at: toMs(e.logged_at) }))
    .filter((c) => c.mg > 0 && inWindow(c.at));
  const doses: CaffeineDose[] = caffeineEntries.map((c) => ({ at: c.at, mg: c.mg }));
  const nonCaffeine = raw.foodEntries.filter((e) => estimateCaffeineMg(e.name) === 0 && inWindow(toMs(e.logged_at)));

  const supplementMarkers: DayTimelineMarker[] = raw.supplementLogs
    .filter((l) => inWindow(toMs(l.logged_at)))
    .map((l) => ({
      id: `supplement:${l.id}`,
      kind: 'supplement' as const,
      at: iso(toMs(l.logged_at)),
      label: l.name ?? 'Suplement',
      detail: l.quantity !== 1 ? `${l.quantity}×` : undefined,
    }));

  const markers: DayTimelineMarker[] = [
    ...caffeineEntries.map((c): DayTimelineMarker => ({
      id: `caffeine:${c.entry.id}`,
      kind: 'caffeine',
      at: iso(c.at),
      label: c.entry.name,
      detail: `${c.mg} mg`,
      caffeineMg: c.mg,
    })),
    ...supplementMarkers,
    ...buildMealMarkers(nonCaffeine),
    ...buildWorkoutMarkers(raw).filter((m) => inWindow(Date.parse(m.at))),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const beforeBed = (m: DayTimelineMarker) => sleepStartMs == null || Date.parse(m.at) <= sleepStartMs;
  const caffeineMarkers = markers.filter((m) => m.kind === 'caffeine');
  const lastCaffeine = caffeineMarkers.filter(beforeBed).at(-1);
  const lastMeal = markers.filter((m) => m.kind === 'meal').filter(beforeBed).at(-1);

  return {
    nightDate: raw.nightDate,
    windowStart: iso(windowStartMs),
    windowEnd: iso(windowEndMs),
    sleepStart: sleepStartMs != null ? iso(sleepStartMs) : null,
    sleepEnd: sleepEndMs != null ? iso(sleepEndMs) : null,
    sleepSegments: buildSegments(raw.phases, sleepStartMs, sleepEndMs),
    hr: toSeries(raw.heartRate, (r) => r.bpm, sleepStartMs, sleepEndMs),
    hrv: toSeries(raw.hrv, (r) => r.hrv, sleepStartMs, sleepEndMs),
    caffeineInBody: buildCaffeineCurve(doses, windowStartMs, windowEndMs),
    markers,
    summary: {
      lastCaffeineAt: lastCaffeine?.at ?? null,
      totalCaffeineMg: caffeineMarkers.reduce((sum, m) => sum + (m.caffeineMg ?? 0), 0),
      caffeineAtBedtimeMg: sleepStartMs != null && doses.length > 0
        ? Math.round(caffeineAt(doses, sleepStartMs))
        : null,
      supplementsTaken: [...new Set(supplementMarkers.map((m) => m.label))],
      lastMealAt: lastMeal?.at ?? null,
    },
  };
}
