import { FC } from 'react';
import { currentYear } from '../../lib/investments/yearFloor';
import type { AnalystChartSpec } from './analystChartSpec';

interface Props {
  spec: AnalystChartSpec;
}

const BAR_AREA_PX = 120;

function formatValue(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value);
}

export const AnalystChart: FC<Props> = ({ spec }) => {
  const max = Math.max(...spec.bars.map((b) => Math.abs(b.value)), 1);
  const summary = spec.bars.map((b) => `${b.label}: ${formatValue(b.value)}${spec.unit ? ` ${spec.unit}` : ''}`).join('; ');

  return (
    <figure className="my-4 rounded-2xl border border-border-custom bg-surface p-3.5 sm:p-4 shadow-xs">
      {spec.title && (
        <figcaption className="mb-3 flex items-baseline justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-text-primary">{spec.title}</span>
          {spec.unit && <span className="text-2xs font-mono text-text-muted">{spec.unit}</span>}
        </figcaption>
      )}
      <div role="img" aria-label={`${spec.title || 'Wykres'}. ${summary}`} className="flex items-end gap-2 sm:gap-3 overflow-x-auto">
        {spec.bars.map((bar) => {
          const h = Math.max(4, Math.round((Math.abs(bar.value) / max) * BAR_AREA_PX));
          return (
            <div key={bar.label} className="flex-1 min-w-12 flex flex-col items-center justify-end">
              {bar.margin !== null && (
                <span className="mb-1 rounded-md border border-border-custom bg-surface-2/60 px-1.5 text-2xs font-mono tabular-nums text-text-secondary">
                  {formatValue(bar.margin)}%
                </span>
              )}
              <span className="mb-0.5 text-2xs font-mono tabular-nums font-semibold text-text-primary">
                {formatValue(bar.value)}
              </span>
              <div
                className={`w-full rounded-t-lg ${bar.value < 0 ? 'bg-danger/70' : 'bg-primary/80'}`}
                style={{ height: `${h}px` }}
              />
              <span className="mt-1 text-2xs font-mono text-text-muted whitespace-nowrap">{bar.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-2xs font-mono text-text-muted">
        {spec.source ? `Źródło: ${spec.source}` : 'Źródło: nie podano'}
        {spec.asOf ? ` · dane do ${spec.asOf}` : ''}
        {` · kwartały ${currentYear()} (dane od 1 stycznia)`}
      </p>
    </figure>
  );
};
