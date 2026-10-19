import { useMemo, type KeyboardEvent, type PointerEvent } from 'react';
import type { DayNightTimeline } from '../../../lib/biometrics/ouraDayTimeline.types';
import { buildPlotFrame, clamp, hourTicks, linearScale, type ViewWindow } from './ouraDayNightLayout';
import { buildChartAriaLabel, describeMoment, formatClock, toSeries } from './ouraDayNightReadout';
import { CaffeineLane, EventsLane, HypnogramLane, SeriesLane } from './OuraDayNightLanes';
import { OuraDayNightTooltip } from './OuraDayNightTooltip';

const KEY_STEP_MS = 15 * 60_000;

interface OuraDayNightPlotProps {
  timeline: DayNightTimeline;
  view: ViewWindow;
  width: number;
  cursorMs: number | null;
  onCursorChange: (ms: number | null) => void;
}

export function OuraDayNightPlot({ timeline, view, width, cursorMs, onCursorChange }: OuraDayNightPlotProps) {
  const zoomed = view.mode === 'night';
  const { startMs, endMs } = view;
  const showEvents = useMemo(
    () => timeline.markers.some((m) => m.kind !== 'caffeine' && Date.parse(m.at) >= startMs && Date.parse(m.at) <= endMs),
    [timeline.markers, startMs, endMs],
  );
  const frame = useMemo(() => buildPlotFrame(width, { zoomed, showEvents }), [width, zoomed, showEvents]);
  const time = useMemo(() => linearScale([startMs, endMs], [frame.x0, frame.x1]), [startMs, endMs, frame]);
  const hr = useMemo(() => toSeries(timeline.hr), [timeline.hr]);
  const hrv = useMemo(() => toSeries(timeline.hrv), [timeline.hrv]);
  const caffeine = useMemo(() => toSeries(timeline.caffeineInBody), [timeline.caffeineInBody]);
  const ariaLabel = useMemo(() => buildChartAriaLabel(timeline), [timeline]);

  const sleepStartMs = timeline.sleepStart ? Date.parse(timeline.sleepStart) : null;
  const sleepEndMs = timeline.sleepEnd ? Date.parse(timeline.sleepEnd) : null;
  const ticks = hourTicks(startMs, endMs, width < 520 ? (zoomed ? 2 : 4) : (zoomed ? 1 : 2));
  const moment = cursorMs === null ? null : describeMoment(timeline, cursorMs);
  const cursorX = cursorMs === null ? 0 : time.map(cursorMs);
  const bandX0 = sleepStartMs === null ? 0 : time.map(Math.max(sleepStartMs, startMs));
  const bandX1 = sleepEndMs === null ? 0 : time.map(Math.min(sleepEndMs, endMs));

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

        {sleepStartMs !== null && sleepEndMs !== null && bandX1 > bandX0 && (
          <g>
            <rect x={bandX0} y={frame.bandTop} width={bandX1 - bandX0} height={frame.axis.top - frame.bandTop} className="oura-dn-band" />
            <text x={bandX0 + 5} y={frame.bandTop - 3} className="oura-dn-band-label">pora snu</text>
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

        {!zoomed && <CaffeineLane frame={frame} timeline={timeline} time={time} series={caffeine} />}
        {frame.events.height > 0 && <EventsLane frame={frame} markers={timeline.markers} time={time} />}
        <HypnogramLane frame={frame} timeline={timeline} time={time} />
        <SeriesLane frame={frame} box={frame.hr} time={time} series={hr} color="var(--oura-hr)" unit="bpm" title="Tętno" />
        <SeriesLane frame={frame} box={frame.hrv} time={time} series={hrv} color="var(--oura-hrv)" unit="ms" title="HRV" />

        {moment && (
          <g pointerEvents="none">
            <line x1={cursorX} x2={cursorX} y1={frame.bandTop} y2={frame.axis.top} className="oura-dn-cursor" />
          </g>
        )}
      </svg>
      {moment && (
        <OuraDayNightTooltip moment={moment} x={cursorX} chartWidth={frame.width}
          top={moment.stage || zoomed ? 2 : frame.sleep.top - 4} />
      )}
    </div>
  );
}
