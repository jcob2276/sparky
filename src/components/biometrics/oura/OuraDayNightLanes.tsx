import { Coffee, Dumbbell, Pill, Utensils } from 'lucide-react';
import type { DayNightTimeline, DayTimelineMarker, DayTimelineMarkerKind } from '../../../lib/biometrics/ouraDayTimeline.types';
import {
  areaPath, clamp, EVENT_ROW, linearScale, linePath, paddedExtent, splitOnGaps, stackMarkerRows, stageRects,
  type LinearScale, type PlotFrame, type TimedValue,
} from './ouraDayNightLayout';
import { caffeineGap, formatClock, valueAt } from './ouraDayNightReadout';

const EVENT_ICON = { caffeine: Coffee, supplement: Pill, meal: Utensils, workout: Dumbbell } satisfies Record<DayTimelineMarkerKind, typeof Coffee>;
const LABEL_W = 38;

type Box = { top: number; height: number };

function toPoints(series: TimedValue[], time: LinearScale, value: LinearScale) {
  return series.map((p) => ({ x: time.map(p.ms), y: value.map(p.value) }));
}

function LaneTitle({ x, top, children }: { x: number; top: number; children: string }) {
  return <text x={x} y={top + 9} className="oura-dn-lane-title">{children}</text>;
}

export function SeriesLane({ frame, box, time, series, color, unit, title }: {
  frame: PlotFrame; box: Box; time: LinearScale; series: TimedValue[]; color: string; unit: string; title: string;
}) {
  const visible = series.filter((p) => p.ms >= time.domain[0] && p.ms <= time.domain[1]);
  if (visible.length === 0) {
    return (
      <g>
        <LaneTitle x={frame.x0} top={box.top}>{title}</LaneTitle>
        <text x={frame.x0} y={box.top + box.height / 2 + 8} className="oura-dn-empty-text">brak danych</text>
      </g>
    );
  }
  const [lo, hi] = paddedExtent(visible.map((p) => p.value), false);
  const scale = linearScale([lo, hi], [box.top + box.height, box.top + 14]);
  const last = visible[visible.length - 1];
  const min = Math.round(Math.min(...visible.map((p) => p.value)));
  const max = Math.round(Math.max(...visible.map((p) => p.value)));
  const labelX = Math.min(time.map(last.ms) + 5, frame.width - 36);
  return (
    <g>
      <LaneTitle x={frame.x0} top={box.top}>{`${title} · ${min}–${max} ${unit}`}</LaneTitle>
      {splitOnGaps(visible, 25 * 60_000).map((run) => (
        run.length > 1
          ? <path key={run[0].ms} d={linePath(toPoints(run, time, scale))} className="oura-dn-line" stroke={color} />
          : <circle key={run[0].ms} cx={time.map(run[0].ms)} cy={scale.map(run[0].value)} r={1.5} fill={color} />
      ))}
      <text x={labelX} y={scale.map(last.value) + 3.5} className="oura-dn-end-label" fill={color}>{Math.round(last.value)}</text>
    </g>
  );
}

/** Caffeine dots with an mg label; a label that would collide with the previous one is dropped (the tooltip still has it). */
function buildCaffeineDots(markers: DayTimelineMarker[], time: LinearScale, level: LinearScale, series: TimedValue[], minX: number, minY: number) {
  let lastEnd = -Infinity;
  return markers.filter((m) => m.kind === 'caffeine')
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

export function CaffeineLane({ frame, timeline, time, series }: {
  frame: PlotFrame; timeline: DayNightTimeline; time: LinearScale; series: TimedValue[];
}) {
  const box = frame.caffeine;
  const max = Math.max(...series.map((p) => p.value), 1);
  const scale = linearScale([0, max * 1.15], [box.top + box.height, box.top + 16]);
  const points = toPoints(series, time, scale);
  const dots = buildCaffeineDots(timeline.markers, time, scale, series, frame.x0, box.top + 24);
  const gap = caffeineGap(timeline);
  const text = gap ? `ostatnia kofeina ${formatClock(gap.fromMs)} → sen: ${gap.label}` : '';
  const half = text.length * 2.9;
  const mid = gap ? (time.map(gap.fromMs) + time.map(gap.toMs)) / 2 : 0;
  const gy = frame.gap.top;
  return (
    <g>
      <LaneTitle x={frame.x0} top={box.top}>{`Kofeina w ciele · szczyt ${Math.round(max)} mg`}</LaneTitle>
      <line x1={frame.x0} x2={frame.x1} y1={scale.map(0)} y2={scale.map(0)} className="oura-dn-baseline" />
      {points.length > 1 && (
        <>
          <path d={areaPath(points, scale.map(0))} fill="url(#oura-dn-caffeine-fill)" />
          <path d={linePath(points)} className="oura-dn-line" stroke="var(--oura-caffeine)" />
        </>
      )}
      {dots.map((d) => (
        <g key={d.id}>
          <circle cx={d.cx} cy={d.cy} r={4.5} className="oura-dn-dot-caffeine" />
          {d.label && <text x={d.label.x} y={d.label.y} textAnchor={d.label.anchor} className="oura-dn-dot-label">{d.label.text}</text>}
        </g>
      ))}
      {gap && (
        <g>
          <text x={clamp(mid, frame.x0 + half, frame.x1 - half)} y={gy + 8} textAnchor="middle" className="oura-dn-gap-label">{text}</text>
          <line x1={time.map(gap.fromMs)} x2={time.map(gap.toMs)} y1={gy + 15} y2={gy + 15} className="oura-dn-gap-line" />
          <line x1={time.map(gap.fromMs)} x2={time.map(gap.fromMs)} y1={gy + 11} y2={gy + 19} className="oura-dn-gap-line" />
          <line x1={time.map(gap.toMs)} x2={time.map(gap.toMs)} y1={gy + 11} y2={gy + 19} className="oura-dn-gap-line" />
        </g>
      )}
    </g>
  );
}

export function EventsLane({ frame, markers, time }: { frame: PlotFrame; markers: DayTimelineMarker[]; time: LinearScale }) {
  const events = markers.filter((m) => m.kind !== 'caffeine' && Date.parse(m.at) >= time.domain[0] && Date.parse(m.at) <= time.domain[1]);
  const xs = events.map((m) => time.map(Date.parse(m.at)));
  const rows = stackMarkerRows(xs, 22, 2);
  return (
    <g>
      <LaneTitle x={frame.x0} top={frame.events.top}>Suple · posiłki · trening</LaneTitle>
      {events.map((m, i) => {
        const Icon = EVENT_ICON[m.kind];
        const cy = frame.events.top + 18 + rows[i] * (EVENT_ROW - 4);
        return (
          <g key={m.id}>
            <circle cx={xs[i]} cy={cy} r={9} className="oura-dn-event" data-kind={m.kind} />
            <Icon x={xs[i] - 5.5} y={cy - 5.5} width={11} height={11} className="oura-dn-event-icon" aria-hidden="true" />
          </g>
        );
      })}
    </g>
  );
}

export function HypnogramLane({ frame, timeline, time }: { frame: PlotFrame; timeline: DayNightTimeline; time: LinearScale }) {
  const rects = stageRects(timeline.sleepSegments, time, frame.sleep.top + 12, frame.hypnoRow);
  return (
    <g>
      <LaneTitle x={frame.x0} top={frame.sleep.top}>Fazy snu</LaneTitle>
      {rects.length === 0 && <text x={frame.x0} y={frame.sleep.top + 34} className="oura-dn-empty-text">brak snu tej nocy</text>}
      {rects.slice(1).map((r, i) => (
        <line key={`step-${r.x}`} x1={r.x} x2={r.x} y1={rects[i].y + rects[i].height / 2} y2={r.y + r.height / 2} className="oura-dn-step" />
      ))}
      {rects.map((r) => (
        <rect key={`${r.stage}-${r.x}`} x={r.x} y={r.y} width={r.width} height={r.height} rx={Math.min(4, r.width / 2)} className="oura-dn-stage" data-stage={r.stage} />
      ))}
    </g>
  );
}
