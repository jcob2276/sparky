import { normalizeUsageBuckets } from '@vanguard/domain';
import { isGarminSaunaActivity } from '../../health/garminSauna';
import { parseMs } from './clock';
import type { FoodEvent, NightInput, PcDay, PhoneDay, SessionSpan, Top5Day } from './inputTypes';
import { round } from './stats';

export interface EnhancedRow {
  date: string;
  sleep_score: number | null;
  total_sleep_hours: number | null;
  deep_sleep_hours: number | null;
  sleep_efficiency: number | null;
  sleep_average_hrv: number | null;
  sleep_latency_minutes: number | null;
  bedtime_start: string | null;
}

export interface SummaryRow {
  date: string;
  sleep_score: number | null;
  total_sleep_hours: number | null;
  deep_sleep_hours: number | null;
  sleep_efficiency: number | null;
  hrv_avg: number | null;
  latency_minutes: number | null;
  bedtime_timestamp: string | null;
}

export interface WorkoutRow {
  workout_day: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
}

export interface GarminRow {
  start_date: string | null;
  elapsed_time: number | null;
  sport_type: string | null;
  name?: string | null;
}

export interface PhoneRow {
  date: string;
  total_minutes: number | null;
  /** Kolumna dodana później niż typy bazy — czytana defensywnie. */
  usage_buckets?: unknown;
}

const num = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Enhanced ma pierwszeństwo, summary uzupełnia braki (np. noce bez wiersza enhanced). */
export function mapNights(enhanced: EnhancedRow[], summary: SummaryRow[]): NightInput[] {
  const byDate = new Map<string, { e?: EnhancedRow; s?: SummaryRow }>();
  for (const e of enhanced) byDate.set(e.date, { ...byDate.get(e.date), e });
  for (const s of summary) byDate.set(s.date, { ...byDate.get(s.date), s });
  return [...byDate.entries()].map(([date, { e, s }]) => {
    const totalH = num(e?.total_sleep_hours) ?? num(s?.total_sleep_hours);
    const deepH = num(e?.deep_sleep_hours) ?? num(s?.deep_sleep_hours);
    return {
      date,
      bedtimeStart: e?.bedtime_start ?? s?.bedtime_timestamp ?? null,
      outcomes: {
        sleep_score: num(e?.sleep_score) ?? num(s?.sleep_score),
        sleep_h: totalH,
        sleep_efficiency: num(e?.sleep_efficiency) ?? num(s?.sleep_efficiency),
        deep_sleep_pct: totalH != null && totalH > 0 && deepH != null ? round((deepH / totalH) * 100, 1) : null,
        sleep_hrv: num(e?.sleep_average_hrv) ?? num(s?.hrv_avg),
        sleep_latency_min: num(e?.sleep_latency_minutes) ?? num(s?.latency_minutes),
      },
    };
  });
}

export function mapFood(rows: Array<{ name: string; logged_at: string | null }>): FoodEvent[] {
  return rows.flatMap((r) => (r.logged_at && parseMs(r.logged_at) != null ? [{ name: r.name, loggedAt: r.logged_at }] : []));
}

function workoutSpan(row: WorkoutRow): SessionSpan | null {
  const startMs = parseMs(row.start_time);
  if (startMs == null) return null;
  const endMs = parseMs(row.end_time) ?? startMs + (row.duration_minutes ?? 0) * 60_000;
  return { startMs, endMs: Math.max(startMs, endMs) };
}

const SAUNA_OVERLAP_MS = 30 * 60_000;
const NOT_TRAINING_SPORTS = new Set(['Walk', 'Hike']);

/** Ten sam trening bywa w workout_sessions i w Garminie: nakładające się przedziały scalamy w jeden. */
function mergeOverlapping(spans: SessionSpan[]): SessionSpan[] {
  const sorted = [...spans].sort((x, y) => x.startMs - y.startMs);
  const merged: SessionSpan[] = [];
  for (const span of sorted) {
    const last = merged.at(-1);
    if (last && span.startMs <= last.endMs) last.endMs = Math.max(last.endMs, span.endMs);
    else merged.push({ ...span });
  }
  return merged;
}

/**
 * Sauna = workout_sessions 'Sauna' + aktywności Garmina „Kardio”. Trening = pozostałe sesje + aktywności Garmina (wiersze
 * source='garmin_intervals', filtr w API), bez dubli. Aktywność Garmina nakładająca się na saunę
 * (zegarek mierzy saunę jako „Workout”) NIE jest treningiem.
 */
export function mapSessions(workouts: WorkoutRow[], garmin: GarminRow[]): { training: SessionSpan[]; sauna: SessionSpan[] } {
  const sauna: SessionSpan[] = [];
  const training: SessionSpan[] = [];
  for (const w of workouts) {
    const span = workoutSpan(w);
    if (span) (w.workout_day.toLowerCase() === 'sauna' ? sauna : training).push(span);
  }
  for (const a of garmin) {
    const startMs = parseMs(a.start_date);
    if (startMs == null || NOT_TRAINING_SPORTS.has(a.sport_type ?? '')) continue;
    const endMs = startMs + (a.elapsed_time ?? 0) * 1000;
    const overlapsSauna = sauna.some((s) => startMs <= s.endMs + SAUNA_OVERLAP_MS && endMs >= s.startMs - SAUNA_OVERLAP_MS);
    if (overlapsSauna) continue;
    // Kardio z Garmina to zawsze pobyt w saunie/spa, nawet gdy nie został zapisany ręcznie.
    (isGarminSaunaActivity(a) ? sauna : training).push({ startMs, endMs });
  }
  return { training: mergeOverlapping(training), sauna };
}

export function mapPhone(rows: PhoneRow[]): PhoneDay[] {
  return rows.map((r) => ({
    date: r.date,
    totalMin: num(r.total_minutes),
    buckets: normalizeUsageBuckets(r.usage_buckets),
  }));
}

export function mapPc(rows: Array<{ date: string; total_active_seconds: number | null }>): PcDay[] {
  return rows.flatMap((r) => (r.total_active_seconds == null ? [] : [{ date: r.date, activeH: r.total_active_seconds / 3600 }]));
}

const MIN_TOP5_TASKS = 3;

export function mapTop5(rows: Array<{ date: string; daily_win_tasks: Array<{ done: boolean | null }> }>): Top5Day[] {
  return rows.flatMap((r) => {
    const total = r.daily_win_tasks.length;
    if (total < MIN_TOP5_TASKS) return [];
    const done = r.daily_win_tasks.filter((t) => t.done === true).length;
    return [{ date: r.date, donePct: round((done / total) * 100, 0) }];
  });
}
