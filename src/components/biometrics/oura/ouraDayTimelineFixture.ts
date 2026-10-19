import type { SleepStage } from '../../../lib/biometrics/ouraSleepTimeline';
import type {
  DayNightTimeline,
  DayTimelineMarker,
  DayTimelinePoint,
  DayTimelineSleepSegment,
} from '../../../lib/biometrics/ouraDayTimeline.types';

/** Realistic night 17→18 Oct 2026 (CEST = UTC+2). Used by the chart tests and for UI work without live data. */
const MIN = 60_000;
const HOUR = 60 * MIN;
const warsaw = (day: number, hh: number, mm = 0) => Date.UTC(2026, 9, day, hh - 2, mm);
const iso = (ms: number) => new Date(ms).toISOString();

const WINDOW_START = warsaw(17, 6);
const WINDOW_END = warsaw(18, 9);
const SLEEP_START = warsaw(17, 23, 40);
const SLEEP_END = warsaw(18, 7, 30);

const NIGHT_PLAN: Array<[SleepStage, number]> = [
  ['awake', 8], ['light', 22], ['deep', 48], ['light', 16], ['rem', 12],
  ['light', 30], ['deep', 36], ['light', 18], ['rem', 22], ['awake', 4],
  ['light', 34], ['rem', 28], ['light', 40], ['deep', 14], ['light', 26],
  ['rem', 38], ['awake', 6], ['light', 28], ['rem', 20], ['light', 20],
];

function buildSegments(): DayTimelineSleepSegment[] {
  const segments: DayTimelineSleepSegment[] = [];
  let cursor = SLEEP_START;
  for (const [stage, minutes] of NIGHT_PLAN) {
    const end = Math.min(cursor + minutes * MIN, SLEEP_END);
    if (end <= cursor) break;
    segments.push({ stage, start: iso(cursor), end: iso(end) });
    cursor = end;
  }
  const last = segments[segments.length - 1];
  if (last) last.end = iso(SLEEP_END);
  return segments;
}

const STAGE_HR: Record<SleepStage, number> = { awake: 64, light: 56, rem: 59, deep: 50 };
const STAGE_HRV: Record<SleepStage, number> = { awake: 38, light: 52, rem: 46, deep: 68 };

const sleepSegments = buildSegments();

function stageAtMs(ms: number): SleepStage | null {
  const hit = sleepSegments.find((s) => ms >= Date.parse(s.start) && ms < Date.parse(s.end));
  return hit ? hit.stage : null;
}

function buildHr(): DayTimelinePoint[] {
  const points: DayTimelinePoint[] = [];
  for (let ms = WINDOW_START; ms <= WINDOW_END; ms += 10 * MIN) {
    const stage = stageAtMs(ms);
    const wobble = Math.sin(ms / (23 * MIN)) * 2.2;
    const hoursAwake = (ms - WINDOW_START) / HOUR;
    const workout = ms >= warsaw(17, 15, 30) && ms <= warsaw(17, 16, 40) ? 52 : 0;
    const day = 68 + Math.sin(hoursAwake * 1.3) * 7 + workout;
    const value = stage ? STAGE_HR[stage] + wobble : ms > SLEEP_END ? 66 + wobble * 2 : day;
    points.push({ at: iso(ms), value: Math.round(value) });
  }
  return points;
}

function buildHrv(): DayTimelinePoint[] {
  const points: DayTimelinePoint[] = [];
  for (let ms = SLEEP_START + 5 * MIN; ms <= SLEEP_END; ms += 5 * MIN) {
    const stage = stageAtMs(ms);
    if (!stage) continue;
    const wobble = Math.sin(ms / (17 * MIN)) * 5;
    points.push({ at: iso(ms), value: Math.round(STAGE_HRV[stage] + wobble) });
  }
  return points;
}

const CAFFEINE_DOSES: Array<{ at: number; mg: number }> = [
  { at: warsaw(17, 8, 10), mg: 95 },
  { at: warsaw(17, 11, 40), mg: 80 },
];

function buildCaffeine(): DayTimelinePoint[] {
  const halfLife = 5 * HOUR;
  const points: DayTimelinePoint[] = [];
  for (let ms = WINDOW_START; ms <= WINDOW_END; ms += 15 * MIN) {
    const value = CAFFEINE_DOSES.reduce(
      (sum, dose) => (ms >= dose.at ? sum + dose.mg * 0.5 ** ((ms - dose.at) / halfLife) : sum),
      0,
    );
    points.push({ at: iso(ms), value: Math.round(value * 10) / 10 });
  }
  return points;
}

const markers: DayTimelineMarker[] = [
  { id: 'c1', kind: 'caffeine', at: iso(CAFFEINE_DOSES[0].at), label: 'Kawa', detail: '95 mg', caffeineMg: 95 },
  { id: 'm1', kind: 'meal', at: iso(warsaw(17, 8, 35)), label: 'Śniadanie', detail: '520 kcal' },
  { id: 'c2', kind: 'caffeine', at: iso(CAFFEINE_DOSES[1].at), label: 'Kawa', detail: '80 mg', caffeineMg: 80 },
  { id: 'm2', kind: 'meal', at: iso(warsaw(17, 13, 15)), label: 'Obiad', detail: '740 kcal' },
  { id: 'w1', kind: 'workout', at: iso(warsaw(17, 15, 30)), label: 'Siłownia', detail: '65 min' },
  { id: 'm3', kind: 'meal', at: iso(warsaw(17, 19, 5)), label: 'Kolacja', detail: '610 kcal' },
  { id: 's1', kind: 'supplement', at: iso(warsaw(17, 21, 10)), label: 'Magnez', detail: '2 kapsułki' },
  { id: 's2', kind: 'supplement', at: iso(warsaw(17, 21, 12)), label: 'Glicynian', detail: '3 g' },
];

export const ouraDayTimelineFixture: DayNightTimeline = {
  nightDate: '2026-10-18',
  windowStart: iso(WINDOW_START),
  windowEnd: iso(WINDOW_END),
  sleepStart: iso(SLEEP_START),
  sleepEnd: iso(SLEEP_END),
  sleepSegments,
  hr: buildHr(),
  hrv: buildHrv(),
  caffeineInBody: buildCaffeine(),
  markers,
  summary: {
    lastCaffeineAt: iso(CAFFEINE_DOSES[1].at),
    totalCaffeineMg: 175,
    caffeineAtBedtimeMg: 28,
    supplementsTaken: ['Magnez', 'Glicynian'],
    lastMealAt: iso(warsaw(17, 19, 5)),
  },
};
