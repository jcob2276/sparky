import { useMemo, type KeyboardEvent, type PointerEvent } from 'react';
import { Coffee, Dumbbell, Pill, Utensils } from 'lucide-react';
import type { DayNightTimeline, DayTimelineMarkerKind } from '../../../lib/biometrics/ouraDayTimeline.types';
import {
  areaPath, buildPlotFrame, clamp, hourTicks, HYPNO_ROW, linearScale, linePath, paddedExtent,
  splitOnGaps, stackMarkerRows, stageRects, EVENT_ROW, type LinearScale, type PlotFrame, type TimedValue,
} from './ouraDayNightLayout';
import {
  buildChartAriaLabel, caffeineGap, describeMoment, formatClock, toSeries, valueAt,
} from './ouraDayNightReadout';
import { OuraDayNightTooltip } from './OuraDayNightTooltip';

const EVENT_ICON = { caffeine: Coffee, supplement: Pill, meal: Utensils, workout: Dumbbell } satisfies Record<DayTimelineMarkerKind, typeof Coffee>;
const KEY_STEP_MS = 15 * 60_000;

const LABEL_W = 38;

/** Caffeine dots with an mg label; a label that would collide with the previous one is dropped (the tooltip still has it). */
function buildCaffeineDots(timeline: DayNightTimeline, time: LinearScale, level: LinearScale, series: TimedValue[], minX: number, minY: number) {
  let lastEnd = -Infinity;
  return timeline.markers.filter((m) => m.kind === 'caffeine')
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((m) => {
      const ms = Date.parse(m.at);
      const cx = time.map(ms);
      const cy = level.map(valueAt(series, ms, 30 * 60_000, true) ?? 0);
      const flip = cx - 8 < minX + 40;
      const x = flip ? cx + 7 : cx - 8;
      const from = flip ? x : x - LABEL_W;
      let label = null;
      if (m.caffeineMg !== undefined && from >= lastEnd) {
        lastEnd = from + LABEL_W;
        label = { x, y: Math.max(minY, flip ? cy - 9 : cy - 5), anchor: flip ? 'start' as const : 'end' as const, text: `${Math.round(m.caffeineMg)} mg` };
      }
      return { id: m.id, cx, cy, label };
    });
}

interface OuraDayNightPlotProps {
  timeline: DayNightTimeline;
  width: number;
  cursorMs: number | null;
  onCursorChange: (ms: number | null) => void;
}

function toPoints(series: TimedValue[], time: LinearScale, value: LinearScale) {
  return series.map((p) => ({ x: time.map(p.ms), y: value.map(p.value) }));
}

function LaneTitle({ frame, top, children }: { frame: PlotFrame; top: number; children: string }) {
  return <text x={frame.x0} y={top + 9} className="oura-dn-lane-title">{children}</text>;
}

function SeriesLane({ frame, box, time, series, color, unit, title }: {
  frame: PlotFrame; box: { top: number; height: number }; time: LinearScale; series: TimedValue[];
  color: string; unit: string; title: string;
}) {
  if (series.length === 0) {
    return (
      <g>
        <LaneTitle frame={frame} top={box.top}>{title}</LaneTitle>
        <text x={frame.x0} y={box.top + box.height / 2 + 8} className="oura-dn-empty-text">brak danych</text>
      </g>
    );
  }
  const [lo, hi] = paddedExtent(series.map((p) => p.value), false);
  const scale = linearScale([lo, hi], [box.top + box.height, box.top + 14]);
  const runs = splitOnGaps(series, 25 * 60_000);
  const last = series[series.length - 1];
  const min = Math.round(Math.min(...series.map((p) => p.value)));
  const max = Math.round(Math.max(...series.map((p) => p.value)));
  const labelX = Math.min(time.map(last.ms) + 5, frame.width - 36);
  return (
    <g>
      <LaneTitle frame={frame} top={box.top}>{`${title} · ${min}–${max} ${unit}`}</LaneTitle>
      {runs.map((run) => (
        run.length > 1
          ? <path key={run[0].ms} d={linePath(toPoints(run, time, scale))} className="oura-dn-line" stroke={color} />
          : <circle key={run[0].ms} cx={time.map(run[0].ms)} cy={scale.map(run[0].value)} r={1.5} fill={color} />
      ))}
      <text x={labelX} y={scale.map(last.value) + 3.5} className="oura-dn-end-label" fill={color}>{Math.round(last.value)}</text>
    </g>
  );
}

export function OuraDayNightPlot({ timeline, width, cursorMs, onCursorChange }: OuraDayNightPlotProps) {
  const frame = useMemo(() => buildPlotFrame(width), [width]);
  const startMs = Date.parse(timeline.windowStart);
  const endMs = Date.parse(timeline.windowEnd);
  const time = useMemo(() => linearScale([startMs, endMs], [frame.x0, frame.x1]), [startMs, endMs, frame]);
  const hr = useMemo(() => toSeries(timeline.hr), [timeline.hr]);
  const hrv = useMemo(() => toSeries(timeline.hrv), [timeline.hrv]);
  const caffeine = useMemo(() => toSeries(timeline.caffeineInBody), [timeline.caffeineInBody]);
  const ariaLabel = useMemo(() => buildChartAriaLabel(timeline), [timeline]);

  const caffeineBox = frame.caffeine;
  const caffeineMax = Math.max(...caffeine.map((p) => p.value), 1);
  const cScale = linearScale([0, caffeineMax * 1.15], [caffeineBox.top + caffeineBox.height, caffeineBox.top + 16]);
  const cPoints = toPoints(caffeine, time, cScale);
  const caffeineDots = buildCaffeineDots(timeline, time, cScale, caffeine, frame.x0, caffeineBox.top + 24);
  const gap = caffeineGap(timeline);
  const sleepStartMs = timeline.sleepStart ? Date.parse(timeline.sleepStart) : null;
  const sleepEndMs = timeline.sleepEnd ? Date.parse(timeline.sleepEnd) : null;
  const ticks = hourTicks(startMs, endMs, width < 520 ? 4 : 2);

  const eventMarkers = timeline.markers.filter((m) => m.kind !== 'caffeine');
  const eventXs = eventMarkers.map((m) => time.map(Date.parse(m.at)));
  const eventRows = stackMarkerRows(eventXs, 22, 2);
  const rects = stageRects(timeline.sleepSegments, time, frame.sleep.top + 12, HYPNO_ROW);

  const moment = cursorMs === null ? null : describeMoment(timeline, cursorMs);
  const cursorX = cursorMs === null ? 0 : time.map(cursorMs);

  const setFromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    onCursorChange(clamp(time.invert(e.clientX - box.left), startMs, endMs));
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 4 * KEY_STEP_MS : KEY_STEP_MS;
    const base = cursorMs ?? sleepStartMs ?? startMs;
    const next: Record<string, number | null> = {
      ArrowLeft: base - step, ArrowRight: base + step, Home: startMs, End: endMs, Escape: null,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    const target = next[e.key];
    onCursorChange(target === null ? null : clamp(target, startMs, endMs));
  };

  const gapMid = gap ? (time.map(gap.fromMs) + time.map(gap.toMs)) / 2 : 0;
  const gapText = gap ? `ostatnia kofeina ${formatClock(gap.fromMs)} → sen: ${gap.label}` : '';
  const gapHalf = gapText.length * 2.9;

  return (
    <div className="oura-dn-plot" style={{ width: frame.width, height: frame.height }}>
      <svg
        width={frame.width} height={frame.height} className="oura-dn-svg" role="img" aria-label={ariaLabel}
        tabIndex={0} onKeyDown={onKeyDown} onPointerDown={setFromPointer} onPointerMove={setFromPointer}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') onCursorChange(null); }}
      >
        <defs>
          <linearGradient id="oura-dn-caffeine-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--oura-caffeine)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--oura-caffeine)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {sleepStartMs !== null && sleepEndMs !== null && (
          <g>
            <rect x={time.map(sleepStartMs)} y={frame.bandTop} width={Math.max(0, time.map(sleepEndMs) - time.map(sleepStartMs))}
              height={frame.axis.top - frame.bandTop} className="oura-dn-band" />
            <text x={time.map(sleepStartMs) + 5} y={frame.bandTop - 3} className="oura-dn-band-label">pora snu</text>
          </g>
        )}

        {ticks.map((ms) => (
          <g key={ms}>
            <line x1={time.map(ms)} x2={time.map(ms)} y1={frame.bandTop} y2={frame.axis.top} className="oura-dn-grid" />
            {time.map(ms) >= frame.x0 + 16 && (
              <text x={time.map(ms)} y={frame.axis.top + 14} textAnchor="middle" className="oura-dn-tick">{formatClock(ms)}</text>
            )}
          </g>
        ))}

        <LaneTitle frame={frame} top={caffeineBox.top}>{`Kofeina w ciele · szczyt ${Math.round(caffeineMax)} mg`}</LaneTitle>
        <line x1={frame.x0} x2={frame.x1} y1={cScale.map(0)} y2={cScale.map(0)} className="oura-dn-baseline" />
        {cPoints.length > 1 && (
          <>
            <path d={areaPath(cPoints, cScale.map(0))} fill="url(#oura-dn-caffeine-fill)" />
            <path d={linePath(cPoints)} className="oura-dn-line" stroke="var(--oura-caffeine)" />
          </>
        )}
        {caffeineDots.map((d) => (
          <g key={d.id}>
            <circle cx={d.cx} cy={d.cy} r={4.5} className="oura-dn-dot-caffeine" />
            {d.label && (
              <text x={d.label.x} y={d.label.y} textAnchor={d.label.anchor} className="oura-dn-dot-label">{d.label.text}</text>
            )}
          </g>
        ))}

        {gap && (
          <g>
            <text x={clamp(gapMid, frame.x0 + gapHalf, frame.x1 - gapHalf)} y={frame.gap.top + 8} textAnchor="middle" className="oura-dn-gap-label">{gapText}</text>
            <line x1={time.map(gap.fromMs)} x2={time.map(gap.toMs)} y1={frame.gap.top + 15} y2={frame.gap.top + 15} className="oura-dn-gap-line" />
            <line x1={time.map(gap.fromMs)} x2={time.map(gap.fromMs)} y1={frame.gap.top + 11} y2={frame.gap.top + 19} className="oura-dn-gap-line" />
            <line x1={time.map(gap.toMs)} x2={time.map(gap.toMs)} y1={frame.gap.top + 11} y2={frame.gap.top + 19} className="oura-dn-gap-line" />
          </g>
        )}

        <LaneTitle frame={frame} top={frame.events.top}>Suple · posiłki · trening</LaneTitle>
        {eventMarkers.map((m, i) => {
          const Icon = EVENT_ICON[m.kind];
          const cx = eventXs[i];
          const cy = frame.events.top + 18 + eventRows[i] * (EVENT_ROW - 4);
          return (
            <g key={m.id}>
              <circle cx={cx} cy={cy} r={9} className="oura-dn-event" data-kind={m.kind} />
              <Icon x={cx - 5.5} y={cy - 5.5} width={11} height={11} className="oura-dn-event-icon" aria-hidden="true" />
            </g>
          );
        })}

        <LaneTitle frame={frame} top={frame.sleep.top}>Fazy snu</LaneTitle>
        {rects.length === 0 && <text x={frame.x0} y={frame.sleep.top + 34} className="oura-dn-empty-text">brak zmierzonego snu</text>}
        {rects.slice(1).map((r, i) => (
          <line key={`step-${r.x}`} x1={r.x} x2={r.x} y1={rects[i].y + rects[i].height / 2} y2={r.y + r.height / 2} className="oura-dn-step" />
        ))}
        {rects.map((r) => (
          <rect key={`${r.stage}-${r.x}`} x={r.x} y={r.y} width={r.width} height={r.height} rx={2.5} className="oura-dn-stage" data-stage={r.stage} />
        ))}

        <SeriesLane frame={frame} box={frame.hr} time={time} series={hr} color="var(--oura-hr)" unit="bpm" title="Tętno" />
        <SeriesLane frame={frame} box={frame.hrv} time={time} series={hrv} color="var(--oura-hrv)" unit="ms" title="HRV" />

        {moment && (
          <g pointerEvents="none">
            <line x1={cursorX} x2={cursorX} y1={frame.bandTop} y2={frame.axis.top} className="oura-dn-cursor" />
            <circle cx={cursorX} cy={cScale.map(moment.caffeineMg ?? 0)} r={3.5} className="oura-dn-cursor-dot" />
          </g>
        )}
      </svg>
      {moment && <OuraDayNightTooltip moment={moment} x={cursorX} chartWidth={frame.width}
        top={moment.stage ? 2 : frame.sleep.top - 4} />}
    </div>
  );
}
