import { Coffee, Dumbbell, Pill, Utensils } from 'lucide-react';
import type { DayTimelineMarkerKind } from '../../../lib/biometrics/ouraDayTimeline.types';
import { clamp } from './ouraDayNightLayout';
import { markerText, STAGE_LABEL, type MomentReadout } from './ouraDayNightReadout';

const MARKER_ICON = {
  caffeine: Coffee,
  supplement: Pill,
  meal: Utensils,
  workout: Dumbbell,
} satisfies Record<DayTimelineMarkerKind, typeof Coffee>;

const TOOLTIP_WIDTH = 200;

interface OuraDayNightTooltipProps {
  moment: MomentReadout;
  x: number;
  chartWidth: number;
  top: number;
}

/** Floating readout pinned to the crosshair; flips to the left of the line past the chart middle. */
export function OuraDayNightTooltip({ moment, x, chartWidth, top }: OuraDayNightTooltipProps) {
  const width = Math.min(TOOLTIP_WIDTH, chartWidth - 8);
  const side = x > chartWidth / 2 ? 'left' : 'right';
  const left = clamp(side === 'right' ? x + 12 : x - 12 - width, 4, chartWidth - width - 4);
  return (
    <div className="oura-dn-tooltip" data-side={side} style={{ left, top, width }} aria-hidden="true">
      <p className="oura-dn-tooltip-time">{moment.time}</p>
      <dl className="oura-dn-tooltip-rows">
        {moment.stage && (
          <div>
            <dt><span className="oura-dn-swatch" data-stage={moment.stage} />Faza</dt>
            <dd>{STAGE_LABEL[moment.stage]}</dd>
          </div>
        )}
        {moment.hr !== null && (
          <div><dt><span className="oura-dn-swatch" data-series="hr" />Tętno</dt><dd>{moment.hr} bpm</dd></div>
        )}
        {moment.hrv !== null && (
          <div><dt><span className="oura-dn-swatch" data-series="hrv" />HRV</dt><dd>{moment.hrv} ms</dd></div>
        )}
        {moment.caffeineMg !== null && (
          <div>
            <dt><span className="oura-dn-swatch" data-series="caffeine" />Kofeina w ciele</dt>
            <dd>~{moment.caffeineMg} mg</dd>
          </div>
        )}
      </dl>
      {moment.markers.length > 0 && (
        <ul className="oura-dn-tooltip-markers">
          {moment.markers.map((marker) => {
            const Icon = MARKER_ICON[marker.kind];
            return (
              <li key={marker.id}><Icon size={12} aria-hidden="true" />{markerText(marker)}</li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
