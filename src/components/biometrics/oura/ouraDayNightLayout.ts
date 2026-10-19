import type { SleepStage } from '../../../lib/biometrics/ouraSleepTimeline';

/** Pure geometry for the day-night chart: scales, SVG paths, ticks, marker stacking. No React, no DOM. */

export interface LinearScale {
  domain: readonly [number, number];
  range: readonly [number, number];
  map: (value: number) => number;
  invert: (pixel: number) => number;
}

export interface XY {
  x: number;
  y: number;
}

export interface TimedValue {
  ms: number;
  value: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function linearScale(domain: readonly [number, number], range: readonly [number, number]): LinearScale {
  const span = domain[1] - domain[0] || 1;
  const rangeSpan = range[1] - range[0];
  return {
    domain,
    range,
    map: (value) => range[0] + ((value - domain[0]) / span) * rangeSpan,
    invert: (pixel) => domain[0] + ((pixel - range[0]) / (rangeSpan || 1)) * span,
  };
}

/** Domain with breathing room; `zeroBased` pins the minimum to 0 (caffeine). */
export function paddedExtent(values: number[], zeroBased: boolean, pad = 0.12): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  return [zeroBased ? 0 : min - span * pad, max + span * pad];
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

export function linePath(points: XY[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${fmt(p.x)} ${fmt(p.y)}`).join(' ');
}

export function areaPath(points: XY[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${fmt(last.x)} ${fmt(baselineY)} L${fmt(first.x)} ${fmt(baselineY)} Z`;
}

/** Splits a series where consecutive samples are further apart than `maxGapMs`, so the line breaks instead of bridging gaps. */
export function splitOnGaps(series: TimedValue[], maxGapMs: number): TimedValue[][] {
  const runs: TimedValue[][] = [];
  for (const point of series) {
    const run = runs[runs.length - 1];
    if (run && point.ms - run[run.length - 1].ms <= maxGapMs) run.push(point);
    else runs.push([point]);
  }
  return runs;
}

/** Whole-hour ticks (Warsaw offsets are whole hours, so UTC multiples of 1 h fall on Warsaw full hours). */
export function hourTicks(startMs: number, endMs: number, stepHours: number): number[] {
  const hour = 3_600_000;
  const step = Math.max(1, Math.round(stepHours)) * hour;
  const ticks: number[] = [];
  for (let ms = Math.ceil(startMs / step) * step; ms <= endMs; ms += step) ticks.push(ms);
  return ticks;
}

/** Row order of the hypnogram, top to bottom. */
const STAGE_ROW: Record<SleepStage, number> = { awake: 0, rem: 1, light: 2, deep: 3 };

export interface StageRect {
  stage: SleepStage;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function stageRects(
  segments: Array<{ stage: SleepStage; start: string; end: string }>,
  time: LinearScale,
  laneTop: number,
  rowHeight: number,
): StageRect[] {
  const rects: StageRect[] = [];
  for (const segment of segments) {
    const startMs = clamp(Date.parse(segment.start), time.domain[0], time.domain[1]);
    const endMs = clamp(Date.parse(segment.end), time.domain[0], time.domain[1]);
    if (!(endMs > startMs)) continue;
    const x = time.map(startMs);
    rects.push({
      stage: segment.stage,
      x,
      y: laneTop + STAGE_ROW[segment.stage] * rowHeight,
      width: Math.max(1, time.map(endMs) - x),
      height: rowHeight - 3,
    });
  }
  return rects;
}

/** Greedy row assignment so neighbouring markers do not overlap: returns a row index (0-based) per input x. */
export function stackMarkerRows(xs: number[], minGap: number, maxRows: number): number[] {
  const lastX: number[] = [];
  const order = xs.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x);
  const rows = new Array<number>(xs.length).fill(0);
  for (const { x, index } of order) {
    let row = lastX.findIndex((last) => x - last >= minGap);
    if (row === -1) row = lastX.length < maxRows ? lastX.length : lastX.indexOf(Math.min(...lastX));
    lastX[row] = x;
    rows[index] = row;
  }
  return rows;
}

interface LaneBox {
  top: number;
  height: number;
}

export type ViewMode = 'full' | 'night';

export interface ViewWindow {
  mode: ViewMode;
  startMs: number;
  endMs: number;
}

const NIGHT_PAD_MS = 30 * 60_000;

/** "night" zooms to bedtime-30min .. wake+30min; without a usable sleep window it falls back to the whole day. */
export function resolveViewWindow(
  windowStart: string,
  windowEnd: string,
  sleepStart: string | null,
  sleepEnd: string | null,
  mode: ViewMode,
): ViewWindow {
  const fullStart = Date.parse(windowStart);
  const fullEnd = Date.parse(windowEnd);
  const sleepFrom = sleepStart ? Date.parse(sleepStart) : NaN;
  const sleepTo = sleepEnd ? Date.parse(sleepEnd) : NaN;
  if (mode === 'night' && Number.isFinite(sleepFrom) && Number.isFinite(sleepTo) && sleepTo > sleepFrom) {
    return {
      mode: 'night',
      startMs: Math.max(fullStart, sleepFrom - NIGHT_PAD_MS),
      endMs: Math.min(fullEnd, sleepTo + NIGHT_PAD_MS),
    };
  }
  return { mode: 'full', startMs: fullStart, endMs: fullEnd };
}

export interface PlotFrame {
  width: number;
  height: number;
  x0: number;
  x1: number;
  zoomed: boolean;
  hypnoRow: number;
  bandTop: number;
  caffeine: LaneBox;
  gap: LaneBox;
  events: LaneBox;
  sleep: LaneBox;
  hr: LaneBox;
  hrv: LaneBox;
  axis: LaneBox;
}

export const EVENT_ROW = 22;

interface FrameOptions {
  zoomed?: boolean;
  /** Zoomed view only: keep the events lane when some marker falls inside the night window. */
  showEvents?: boolean;
}

/**
 * Vertical rhythm of the lanes; the right margin is reserved for end-of-line value labels.
 * Zoomed ("night only") drops the caffeine/gap lanes and gives the hypnogram and HR/HRV lanes touch-sized rows.
 */
export function buildPlotFrame(width: number, { zoomed = false, showEvents = false }: FrameOptions = {}): PlotFrame {
  const w = Math.max(280, width);
  const hypnoRow = zoomed ? 24 : 15;
  let y = 18;
  const lane = (height: number, after = 8): LaneBox => {
    const box = { top: y, height };
    y += height + after;
    return box;
  };
  const caffeine = zoomed ? lane(0, 0) : lane(88, 2);
  const gap = zoomed ? lane(0, 0) : lane(20, 6);
  const events = !zoomed || showEvents ? lane(EVENT_ROW * 2, 8) : lane(0, 0);
  const sleep = lane(hypnoRow * 4 + 12, 10);
  const hr = lane(zoomed ? 76 : 46, 6);
  const hrv = lane(zoomed ? 76 : 46, 4);
  const axis = lane(20, 0);
  return { width: w, height: y, x0: 10, x1: w - 44, zoomed, hypnoRow, bandTop: 12, caffeine, gap, events, sleep, hr, hrv, axis };
}
