import { FC, useMemo } from 'react';
import { QuarterHistoryItem } from '../../lib/investments/superinvestorDetailService';

interface Props {
  quarters: QuarterHistoryItem[];
  quarterGrowthPct: string;
}

export const SuperinvestorQuarterChart: FC<Props> = ({ quarters, quarterGrowthPct }) => {
  const maxVal = useMemo(() => {
    if (!quarters || quarters.length === 0) return 1;
    const vals = quarters.map((q) => q.rawValue);
    return Math.max(...vals, 1);
  }, [quarters]);

  if (!quarters || quarters.length === 0) {
    return null;
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border-custom shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border-custom/50 pb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-text-primary font-mono">
          Wartość Portfela 13F
        </h3>
        <div className="flex items-center gap-1.5 text-2xs font-mono font-bold">
          <span className="text-text-muted">RAPORTY OD 1 STYCZNIA ·</span>
          <span className="text-text-muted">KONIEC KWARTAŁU</span>
          <span className="text-text-secondary font-semibold">q/q: {quarterGrowthPct}</span>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="pt-8 pb-2">
        <div className="h-44 sm:h-48 flex items-end justify-between gap-2 sm:gap-4 px-2">
          {quarters.map((q, idx) => {
            const heightPercent = Math.max(0, Math.round((q.rawValue / maxVal) * 100));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Value Above Bar */}
                <div className="text-2xs font-mono font-medium text-text-secondary mb-1.5 tracking-tighter text-center whitespace-nowrap">
                  {q.valueFormatted}
                </div>

                {/* Vertical Bar */}
                <div
                  className={`w-full max-w-14 rounded-t-lg transition-all duration-300 ${
                    q.isLatest
                      ? 'bg-success/80 group-hover:bg-success shadow-xs'
                      : q.isBaseline ? 'bg-surface-elevated border border-dashed border-border-custom opacity-70'
                      : 'bg-surface-elevated border border-border-custom/80 group-hover:border-primary/50'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Quarter Label Below Bar */}
                <div
                  className={`text-2xs font-mono mt-2 font-bold ${
                    q.isLatest ? 'text-success' : 'text-text-muted'
                  }`}
                >
                  {q.quarterLabel}
                </div>
                {q.isBaseline && (
                  <div className="text-2xs font-mono text-text-muted">baseline Q/Q</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">Wartość odczytanych pozycji 13F obejmuje również opcje i PRN. Jej zmiana nie jest stopą zwrotu funduszu. Źródło: SEC EDGAR 13F · raporty z bieżącego roku; kwartał z poprzedniego roku to wyłącznie baseline porównania Q/Q.</p>
    </div>
  );
};
