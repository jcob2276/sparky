import { warsawTimeOfDay } from '../../../lib/date';
import type { SleepStage } from '../../../lib/biometrics/ouraSleepTimeline';
import type {
  DayNightTimeline,
  DayTimelineMarker,
  DayTimelinePoint,
  DayTimelineSleepSegment,
} from '../../../lib/biometrics/ouraDayTimeline.types';
import type { TimedValue } from './ouraDayNightLayout';

/** Text-side logic of the day-night chart: what is true at a given instant, plus its accessible descriptions. */

export const STAGE_LABEL: Record<SleepStage, string> = {
  awake: 'czuwanie',
  rem: 'REM',
  light: 'płytki',
  deep: 'głęboki',
};

const MIN = 60_000;
const MARKER_WINDOW_MS = 12 * MIN;

export function toSeries(points: DayTimelinePoint[]): TimedValue[] {
  return points
    .map((p) => ({ ms: Date.parse(p.at), value: p.value }))
    .filter((p) => Number.isFinite(p.ms) && Number.isFinite(p.value))
    .sort((a, b) => a.ms - b.ms);
}

export function formatClock(ms: number): string {
  return warsawTimeOfDay(new Date(ms).toISOString());
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Linear interpolation, or null when `ms` is further than `maxGapMs` from the nearest sample. */
export function valueAt(series: TimedValue[], ms: number, maxGapMs: number, interpolate: boolean): number | null {
  if (series.length === 0) return null;
  let after = series.findIndex((p) => p.ms >= ms);
  if (after === -1) after = series.length;
  const next = series[after];
  const prev = series[after - 1];
  if (prev && next && interpolate && next.ms - prev.ms <= maxGapMs * 2) {
    const ratio = next.ms === prev.ms ? 0 : (ms - prev.ms) / (next.ms - prev.ms);
    return prev.value + (next.value - prev.value) * ratio;
  }
  const candidates = [prev, next].filter((p): p is TimedValue => p !== undefined);
  const nearest = candidates.sort((a, b) => Math.abs(a.ms - ms) - Math.abs(b.ms - ms))[0];
  return nearest && Math.abs(nearest.ms - ms) <= maxGapMs ? nearest.value : null;
}

function stageAt(segments: DayTimelineSleepSegment[], ms: number): SleepStage | null {
  const hit = segments.find((s) => ms >= Date.parse(s.start) && ms < Date.parse(s.end));
  return hit ? hit.stage : null;
}

export interface MomentReadout {
  ms: number;
  time: string;
  stage: SleepStage | null;
  hr: number | null;
  hrv: number | null;
  caffeineMg: number | null;
  markers: DayTimelineMarker[];
}

export function describeMoment(timeline: DayNightTimeline, ms: number): MomentReadout {
  const hr = valueAt(toSeries(timeline.hr), ms, 15 * MIN, true);
  const hrv = valueAt(toSeries(timeline.hrv), ms, 15 * MIN, true);
  const caffeine = valueAt(toSeries(timeline.caffeineInBody), ms, 30 * MIN, true);
  return {
    ms,
    time: formatClock(ms),
    stage: stageAt(timeline.sleepSegments, ms),
    hr: hr === null ? null : Math.round(hr),
    hrv: hrv === null ? null : Math.round(hrv),
    caffeineMg: caffeine === null ? null : Math.round(caffeine),
    markers: timeline.markers.filter((m) => Math.abs(Date.parse(m.at) - ms) <= MARKER_WINDOW_MS),
  };
}

export function markerText(marker: DayTimelineMarker): string {
  return marker.detail ? `${marker.label} ${marker.detail}` : marker.label;
}

/** '02:10 · głęboki · 52 bpm · HRV 61 ms · kofeina w ciele ~18 mg' */
export function formatMomentLine(moment: MomentReadout): string {
  const parts = [moment.time];
  if (moment.stage) parts.push(STAGE_LABEL[moment.stage]);
  if (moment.hr !== null) parts.push(`${moment.hr} bpm`);
  if (moment.hrv !== null) parts.push(`HRV ${moment.hrv} ms`);
  if (moment.caffeineMg !== null) parts.push(`kofeina w ciele ~${moment.caffeineMg} mg`);
  for (const marker of moment.markers) parts.push(markerText(marker));
  return parts.join(' · ');
}

export interface CaffeineGap {
  fromMs: number;
  toMs: number;
  label: string;
}

/** Last caffeine -> bedtime. Null when either end is unknown or caffeine came after bedtime. */
export function caffeineGap(timeline: DayNightTimeline): CaffeineGap | null {
  const { lastCaffeineAt } = timeline.summary;
  if (!lastCaffeineAt || !timeline.sleepStart) return null;
  const fromMs = Date.parse(lastCaffeineAt);
  const toMs = Date.parse(timeline.sleepStart);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return null;
  return { fromMs, toMs, label: formatDuration(toMs - fromMs) };
}

/** One-line recap of everything before the zoomed night window. */
export function buildPreSleepNote(timeline: DayNightTimeline): string {
  const { lastCaffeineAt, caffeineAtBedtimeMg, lastMealAt, supplementsTaken } = timeline.summary;
  const parts: string[] = [];
  if (lastCaffeineAt) {
    const mg = caffeineAtBedtimeMg === null ? '' : `, ~${Math.round(caffeineAtBedtimeMg)} mg w ciele`;
    parts.push(`ostatnia kofeina ${formatClock(Date.parse(lastCaffeineAt))}${mg}`);
  } else {
    parts.push('bez kofeiny');
  }
  if (lastMealAt) parts.push(`ostatni posiłek ${formatClock(Date.parse(lastMealAt))}`);
  if (supplementsTaken.length > 0) parts.push(`suple: ${supplementsTaken.join(', ')}`);
  return `przed snem: ${parts.join(' · ')}`;
}

export function buildChartAriaLabel(timeline: DayNightTimeline): string {
  const parts = [`Wykres dzień-noc dla nocy ${timeline.nightDate}.`];
  if (timeline.sleepStart && timeline.sleepEnd) {
    parts.push(`Sen od ${formatClock(Date.parse(timeline.sleepStart))} do ${formatClock(Date.parse(timeline.sleepEnd))}.`);
  } else {
    parts.push('Brak zmierzonego snu.');
  }
  const { totalCaffeineMg, caffeineAtBedtimeMg } = timeline.summary;
  if (totalCaffeineMg > 0) {
    parts.push(`Kofeina łącznie ${Math.round(totalCaffeineMg)} mg`
      + (caffeineAtBedtimeMg !== null ? `, w ciele przy zasypianiu ok. ${Math.round(caffeineAtBedtimeMg)} mg.` : '.'));
  }
  const gap = caffeineGap(timeline);
  if (gap) parts.push(`Od ostatniej kofeiny do snu ${gap.label}.`);
  parts.push(`Zdarzenia: ${timeline.markers.length}. Szczegóły w tabeli poniżej; strzałki przesuwają kursor po godzinach.`);
  return parts.join(' ');
}

export interface AltRow {
  key: string;
  ms: number;
  time: string;
  summary: string;
}

/** Hourly rows (plus every marker) for the screen-reader table. */
export function buildAltRows(timeline: DayNightTimeline): AltRow[] {
  const start = Date.parse(timeline.windowStart);
  const end = Date.parse(timeline.windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const hour = 60 * MIN;
  const rows: AltRow[] = [];
  for (let ms = Math.ceil(start / hour) * hour; ms <= end; ms += hour) {
    const line = formatMomentLine({ ...describeMoment(timeline, ms), markers: [] });
    rows.push({ key: `h${ms}`, ms, time: formatClock(ms), summary: line.split(' · ').slice(1).join(' · ') || 'brak danych' });
  }
  for (const marker of timeline.markers) {
    const ms = Date.parse(marker.at);
    rows.push({ key: `m${marker.id}`, ms, time: formatClock(ms), summary: `${markerText(marker)} (${marker.kind})` });
  }
  return rows.sort((a, b) => a.ms - b.ms);
}
