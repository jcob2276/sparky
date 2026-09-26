import { FC, useMemo } from 'react';
import { HoldingChangeItem } from '../../lib/investments/superinvestorDetailService';

interface Props {
  basketValueFormatted: string;
  holdings: HoldingChangeItem[];
  sectors: { name: string; weightPct: number }[];
  periodQuarter: string;
  recentActivity: { type: string; ticker: string; details: string; isNegative?: boolean }[];
}

const DONUT_COLORS = [
  'var(--color-primary)',
  'var(--color-warning)',
  'var(--color-success)',
  'var(--color-text-secondary)',
  'var(--color-danger)',
];

export const SuperinvestorSidePanels: FC<Props> = ({
  basketValueFormatted,
  holdings,
  sectors,
  periodQuarter,
  recentActivity,
}) => {
  const radius = 54;
  const strokeWidth = 14;
  const center = 70;
  const circumference = 2 * Math.PI * radius;

  // Pre-calculate SVG Donut slices immutably
  const donutSlices = useMemo(() => {
    const topHoldings = holdings.slice(0, 5);
    const totalWeight = topHoldings.reduce((sum, h) => sum + (h.weightPct || 1), 0) || 1;

    return topHoldings.map((h, i) => {
      const prevWeight = topHoldings.slice(0, i).reduce((sum, item) => sum + (item.weightPct || 1), 0);
      const currentAngle = prevWeight / totalWeight;
      const fraction = (h.weightPct || 1) / totalWeight;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -currentAngle * circumference;
      const color = DONUT_COLORS[i % DONUT_COLORS.length];

      return {
        key: `${h.ticker}_${i}`,
        strokeDasharray,
        strokeDashoffset,
        color,
      };
    });
  }, [holdings, circumference]);

  return (
    <div className="space-y-4">
      {/* 1. Struktura pozycji (Donut) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-4">
        <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono border-b border-border-custom/50 pb-3">
          Struktura Pozycji
        </h3>

        <div className="flex flex-col items-center justify-center pt-2 pb-1 relative">
          <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
            {donutSlices.map((slice) => (
              <circle
                key={slice.key}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            ))}
          </svg>

          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-base font-black text-text-primary tracking-tight font-mono">
              {basketValueFormatted}
            </span>
            <span className="text-3xs uppercase tracking-wider text-text-muted font-mono font-semibold">
              Wartość Koszyka
            </span>
          </div>
        </div>
      </div>

      {/* 2. Alokacja Sektorowa */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-border-custom/50 pb-3">
          <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono">
            Alokacja Sektorowa
          </h3>
          <span className="text-3xs font-mono font-semibold text-text-muted">
            WG WARTOŚCI POZYCJI · {periodQuarter}
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {sectors.slice(0, 5).map((sec, i) => (
            <div key={sec.name + i} className="space-y-1">
              <div className="flex items-center justify-between text-2xs font-mono">
                <span className="text-text-secondary truncate max-w-40">{sec.name}</span>
                <span className="font-bold text-text-primary">
                  {sec.weightPct.toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden border border-border-custom/40">
                <div
                  className="h-full rounded-full bg-primary/75"
                  style={{ width: `${Math.min(100, Math.max(3, sec.weightPct))}%` }}
                />
              </div>
            </div>
          ))}

          {sectors.length === 0 && (
            <div className="text-2xs font-mono text-text-muted text-center py-2">
              Brak zdefiniowanych sektorów
            </div>
          )}
        </div>
      </div>

      {/* 3. Ruchy w ostatnim 13F */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-3">
        <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono border-b border-border-custom/50 pb-3">
          Ruchy w Ostatnim 13F
        </h3>

        <div className="space-y-2 pt-1">
          {recentActivity.map((act, i) => (
            <div
              key={act.ticker + i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated/40 border border-border-custom/40 text-xs font-mono"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-3xs font-bold shrink-0 ${
                    act.isNegative
                      ? 'bg-danger/10 text-danger border border-danger/20'
                      : 'bg-success/10 text-success border border-success/20'
                  }`}
                >
                  {act.type}
                </span>
                <span className="font-bold text-text-primary truncate">{act.ticker}</span>
              </div>
              <span className="text-3xs text-text-secondary font-medium shrink-0 ml-2">
                {act.details}
              </span>
            </div>
          ))}

          {recentActivity.length === 0 && (
            <div className="text-2xs font-mono text-text-muted text-center py-2">
              Brak zmian w ostatnim zgłoszeniu
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
