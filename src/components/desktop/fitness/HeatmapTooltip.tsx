import { createPortal } from 'react-dom';

export interface HeatmapCellData {
  vol: number;
  wellness: boolean;
  name: string | null;
  exercises: string[];
  rpe: number | null;
}

export interface HeatmapDay {
  date: string;
  future: boolean;
  data: HeatmapCellData | null;
}

export interface HeatmapTooltipState {
  day: HeatmapDay;
  kmRun: number;
  rect: DOMRect;
}

interface HeatmapTooltipProps {
  tooltip: HeatmapTooltipState | null;
}

export function HeatmapTooltip({ tooltip }: HeatmapTooltipProps) {
  if (!tooltip) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: Math.min(tooltip.rect.right + 10, window.innerWidth - 190),
        top: Math.max(8, tooltip.rect.top - 36),
        zIndex: 'var(--ds-inline-style-9999)',
        pointerEvents: 'none',
      }}
      className="rounded-[var(--radius-md)] border border-border-custom bg-surface shadow-xl px-3.5 py-2.5 min-w-[var(--ds-w-160px)]"
    >
      <p className="text-2xs font-black text-text-muted mb-1">{tooltip.day.date}</p>
      {tooltip.kmRun > 0 && (
        <p className="text-xs font-bold text-warning mt-0.5">{tooltip.kmRun.toFixed(1)} km biegu</p>
      )}
      {tooltip.day.data && (
        <>
          {tooltip.day.data.name && <p className="text-sm font-black text-text-primary leading-tight">{tooltip.day.data.name}</p>}
          {tooltip.day.data.wellness ? (
            <p className="text-xs text-info font-bold mt-0.5">Wellness</p>
          ) : (
            <>
              {tooltip.day.data.vol > 0 && <p className="text-xs font-bold text-primary mt-0.5">{(tooltip.day.data.vol / 1000).toFixed(1)} Mg</p>}
              {tooltip.day.data.rpe && <p className="text-2xs text-text-muted mt-0.5">RPE <span className="font-black">{tooltip.day.data.rpe}</span></p>}
            </>
          )}
          {tooltip.day.data.exercises?.length > 0 && (
            <p className="text-2xs text-text-muted mt-1 leading-relaxed">{tooltip.day.data.exercises.join(' · ')}</p>
          )}
        </>
      )}
    </div>,
    document.body
  );
}
