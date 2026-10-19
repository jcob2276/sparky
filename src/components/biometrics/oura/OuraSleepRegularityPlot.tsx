import { useMemo, type KeyboardEvent, type PointerEvent } from 'react';
import {
  CONSISTENCY_TOLERANCE_MIN, formatAxisClock, type RegularityNight, type SleepRegularity,
} from '../../../lib/biometrics/ouraSleepRegularity';
import { shiftDateStr } from '../../../lib/date';
import { clamp, linearScale } from './ouraDayNightLayout';

const HEIGHT = 264;
const MARGIN = { top: 12, right: 10, bottom: 28, left: 44 };
const TICK_STEP = 120;

interface PlotProps {
  data: SleepRegularity;
  width: number;
  activeDate: string | null;
  onActiveChange: (date: string | null, anchorX?: number) => void;
  ariaLabel: string;
}

/** Axis domain (minutes since 18:00) fitted to the data, snapped to whole hours, at least 10 h tall. */
function axisDomain(nights: RegularityNight[]): [number, number] {
  const lo = Math.min(...nights.map((n) => n.bedtimeAxis));
  const hi = Math.max(...nights.map((n) => n.wakeAxis));
  let start = Math.max(0, Math.floor((lo - 30) / 60) * 60);
  let end = Math.ceil((hi + 30) / 60) * 60;
  if (end - start < 600) end = start + 600;
  if (end > 1440) { start = Math.max(0, start - (end - 1440)); end = 1440; }
  return [start, end];
}

function dayCount(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1;
}

export function OuraSleepRegularityPlot({ data, width, activeDate, onActiveChange, ariaLabel }: PlotProps) {
  const { nights, windowStart, windowEnd, medianBedtimeAxis } = data;
  const slots = dayCount(windowStart, windowEnd);
  const plotW = Math.max(120, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const colW = plotW / slots;
  const barW = Math.min(20, colW * 0.62);
  const [d0, d1] = useMemo(() => axisDomain(nights), [nights]);
  const y = useMemo(() => linearScale([d0, d1], [MARGIN.top, MARGIN.top + plotH]), [d0, d1, plotH]);
  const slotOf = (date: string) => dayCount(windowStart, date) - 1;
  const centerX = (slot: number) => MARGIN.left + slot * colW + colW / 2;

  const ticks: number[] = [];
  for (let t = Math.ceil(d0 / TICK_STEP) * TICK_STEP; t <= d1; t += TICK_STEP) ticks.push(t);

  const pickFromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const slot = clamp(Math.floor((e.clientX - box.left - MARGIN.left) / colW), 0, slots - 1);
    const date = shiftDateStr(windowStart, slot);
    onActiveChange(nights.some((n) => n.date === date) ? date : null, centerX(slot));
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const index = nights.findIndex((n) => n.date === activeDate);
    const moves: Record<string, number | null> = {
      ArrowLeft: index <= 0 ? 0 : index - 1,
      ArrowRight: index < 0 ? nights.length - 1 : Math.min(nights.length - 1, index + 1),
      Home: 0,
      End: nights.length - 1,
      Escape: null,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const target = moves[e.key];
    onActiveChange(
      target === null ? null : nights[target].date,
      target === null ? undefined : centerX(slotOf(nights[target].date)),
    );
  };

  const zoneTop = medianBedtimeAxis === null ? 0 : y.map(medianBedtimeAxis - CONSISTENCY_TOLERANCE_MIN);
  const zoneBottom = medianBedtimeAxis === null ? 0 : y.map(medianBedtimeAxis + CONSISTENCY_TOLERANCE_MIN);

  return (
    <svg
      width={width} height={HEIGHT} className="oura-sr-svg" role="img" aria-label={ariaLabel} tabIndex={0}
      onKeyDown={onKeyDown} onPointerDown={pickFromPointer} onPointerMove={pickFromPointer}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') onActiveChange(null); }}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line className="oura-sr-grid" x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y.map(t)} y2={y.map(t)} />
          <text className="oura-sr-tick" x={MARGIN.left - 6} y={y.map(t)} textAnchor="end" dominantBaseline="middle">
            {formatAxisClock(t)}
          </text>
        </g>
      ))}
      {medianBedtimeAxis !== null && (
        <g>
          <rect className="oura-sr-zone" x={MARGIN.left} y={zoneTop} width={plotW} height={zoneBottom - zoneTop} />
          <line className="oura-sr-median" x1={MARGIN.left} x2={MARGIN.left + plotW}
            y1={y.map(medianBedtimeAxis)} y2={y.map(medianBedtimeAxis)} />
          <text className="oura-sr-median-label" x={MARGIN.left + plotW} y={zoneTop - 3} textAnchor="end">
            mediana {formatAxisClock(medianBedtimeAxis)} ±{CONSISTENCY_TOLERANCE_MIN} min
          </text>
        </g>
      )}
      {nights.map((n) => {
        const slot = slotOf(n.date);
        const top = y.map(n.bedtimeAxis);
        const active = n.date === activeDate;
        return (
          <g key={n.date}>
            {active && (
              <rect className="oura-sr-active" x={MARGIN.left + slot * colW} y={MARGIN.top} width={colW} height={plotH} />
            )}
            <rect
              className="oura-sr-bar" data-within={n.withinTolerance} data-latest={n.isLatest || undefined}
              x={centerX(slot) - barW / 2} y={top} width={barW} height={Math.max(2, y.map(n.wakeAxis) - top)}
              rx={Math.min(5, barW / 2)} style={{ animationDelay: `${slot * 18}ms` }}
            />
            <text className="oura-sr-day" data-latest={n.isLatest || undefined} x={centerX(slot)} y={HEIGHT - 9}
              textAnchor="middle">{n.weekday}</text>
          </g>
        );
      })}
    </svg>
  );
}
