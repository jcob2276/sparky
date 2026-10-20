import type { EffectDirection, SplitComparison } from '../../../../lib/biometrics/sleepDrivers/types';
import { formatNumber } from './driverGroups';

const DOT_TONE: Record<EffectDirection, string> = {
  helps: 'bg-success',
  hurts: 'bg-warning',
  unclear: 'bg-info',
};

interface SplitBarsProps {
  split: SplitComparison;
  unit: string;
  outcomeLabel: string;
  direction: EffectDirection;
}

/**
 * Porównanie dwóch grup nocy na wspólnej, przybliżonej osi (dwie kropki + różnica).
 * Oś nie zaczyna się od zera, bo różnice rzędu 1-2 pkt byłyby niewidoczne — wartości są zawsze podane tekstem.
 */
export function SplitBars({ split, unit, outcomeLabel, direction }: SplitBarsProps) {
  const lo = Math.min(split.lowMean, split.highMean);
  const hi = Math.max(split.lowMean, split.highMean);
  const pad = Math.max((hi - lo) * 0.6, 0.5);
  const min = lo - pad;
  const span = hi + pad - min;
  const rows = [
    { label: split.lowLabel, n: split.lowN, mean: split.lowMean },
    { label: split.highLabel, n: split.highN, mean: split.highMean },
  ];
  return (
    <figure className="space-y-2" aria-label={`${outcomeLabel}: ${split.thresholdLabel}`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-text-muted">
        <span>{split.thresholdLabel}</span>
        <span className="font-semibold text-text-secondary">różnica {formatNumber(split.delta, 1, true)} {unit}</span>
      </figcaption>
      <ul className="space-y-2">
        {rows.map((row) => {
          const left = `${(row.mean - min) / span * 100}%`;
          return (
            <li key={row.label} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate text-text-secondary sm:w-36" title={row.label}>{row.label}</span>
              <span aria-hidden="true" className="relative h-4 min-w-0 flex-1">
                <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                <span
                  className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${DOT_TONE[direction]}`}
                  style={{ left }}
                />
              </span>
              <span className="shrink-0 tabular-nums text-text-primary">
                {formatNumber(row.mean)} {unit} <span className="text-text-muted">· n={row.n}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
