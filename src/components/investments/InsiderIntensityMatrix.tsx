import { FC } from 'react';
import { InsiderIntensityRow } from '../../lib/investments/insidersService';

interface Props {
  rows: InsiderIntensityRow[];
}

export const InsiderIntensityMatrix: FC<Props> = ({ rows }) => {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-custom/50 pb-3">
        <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono">
          Natężenie zakupów insiderów (90 dni)
        </h3>
        <span className="text-3xs font-mono font-bold text-text-muted uppercase tracking-wider">
          SPÓŁKI × TYGODNIE · KOLOR = LICZBA TRANSAKCJI ▾
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pt-1">
        <div className="min-w-[540px] space-y-2">
          {rows.map((row) => (
            <div key={row.ticker} className="flex items-center gap-3">
              {/* Ticker Column */}
              <div className="w-16 shrink-0 font-mono text-xs font-bold text-text-primary">
                {row.ticker}
              </div>

              {/* 12 Weekly Blocks */}
              <div className="flex-1 grid grid-cols-12 gap-1.5 sm:gap-2">
                {row.weeklyCounts.map((cnt, wIdx) => {
                  let cellBg = 'bg-surface-elevated/40 border-border-custom/40';
                  if (cnt >= 12) cellBg = 'bg-success text-black border-success';
                  else if (cnt >= 7) cellBg = 'bg-success/70 text-text-primary border-success/60';
                  else if (cnt >= 4) cellBg = 'bg-success/40 text-text-primary border-success/40';
                  else if (cnt > 0) cellBg = 'bg-success/20 text-text-secondary border-success/25';

                  return (
                    <div
                      key={wIdx}
                      title={`Tydzień ${wIdx + 1}: ${cnt} transakcji`}
                      className={`h-7 sm:h-8 rounded-lg border flex items-center justify-center font-mono text-3xs font-bold transition-all duration-150 hover:scale-105 cursor-pointer shadow-2xs ${cellBg}`}
                    >
                      {cnt > 0 ? cnt : ''}
                    </div>
                  );
                })}
              </div>

              {/* Total Badge */}
              <div className="w-12 text-right shrink-0 font-mono text-3xs font-bold text-text-muted">
                {row.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
