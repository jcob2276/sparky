import { FC } from 'react';
import { Star } from 'lucide-react';
import { GpwStockItem } from '../../lib/investments/gpwCompaniesService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  stock: GpwStockItem;
  isWatched: boolean;
  onToggleWatchlist: (ticker: string) => void;
  onSelect: (ticker: string) => void;
}

function fmtPln(val: number | null): string {
  if (val == null) return '—';
  return val.toFixed(2).replace('.', ',');
}

function compute12mSparkline(pts: number[]): { pathPoints: string; isPositive12m: boolean } {
  if (!pts || pts.length < 2) return { pathPoints: '', isPositive12m: true };
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const w = 68;
  const h = 22;

  const coords = pts.map((val, idx) => {
    const x = (idx / (pts.length - 1)) * w;
    const y = h - ((val - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = pts[0];
  const last = pts[pts.length - 1];
  return {
    pathPoints: coords.join(' '),
    isPositive12m: last >= first,
  };
}

export const GpwCompanyRow: FC<Props> = ({
  stock,
  isWatched,
  onToggleWatchlist,
  onSelect,
}) => {
  const isPositiveToday = (stock.changeTodayPct || 0) >= 0;
  const { pathPoints, isPositive12m } = compute12mSparkline(stock.sparkline12m);

  return (
    <tr
      onClick={() => onSelect(stock.ticker)}
      className="hover:bg-surface-elevated/40 transition-colors cursor-pointer group border-b border-border-custom/30"
    >
      {/* SPÓŁKA */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          <CompanyLogo ticker={stock.ticker} name={stock.name} size={30} />
          <div className="min-w-0">
            <div className="font-bold text-text-primary group-hover:text-primary transition-colors text-xs sm:text-sm">
              {stock.ticker}
            </div>
            <div className="text-3xs text-text-muted truncate max-w-40 sm:max-w-64 uppercase tracking-wider font-mono">
              {stock.name}
            </div>
          </div>
        </div>
      </td>

      {/* KURS PLN */}
      <td className="py-3 px-3 text-right font-medium text-text-primary font-mono text-xs sm:text-sm">
        {fmtPln(stock.close)}
      </td>

      {/* DZIŚ */}
      <td
        className={`py-3 px-3 text-right font-semibold font-mono text-xs ${
          stock.changeTodayPct == null
            ? 'text-text-muted'
            : isPositiveToday
            ? 'text-success'
            : 'text-danger'
        }`}
      >
        {stock.changeTodayPct != null
          ? `${stock.changeTodayPct > 0 ? '+' : ''}${stock.changeTodayPct.toFixed(1).replace('.', ',')}%`
          : '—'}
      </td>

      {/* SHORT */}
      <td className="py-3 px-3 text-right font-bold text-text-primary font-mono text-xs">
        {stock.shortPct != null
          ? `${stock.shortPct.toFixed(2).replace('.', ',')}%`
          : '—'}
      </td>

      {/* ZM. 14D */}
      <td
        className={`py-3 px-3 text-right font-mono text-xs ${
          stock.diff14dPp == null
            ? 'text-text-muted'
            : stock.diff14dPp > 0
            ? 'text-danger font-semibold'
            : stock.diff14dPp < 0
            ? 'text-success font-semibold'
            : 'text-text-muted'
        }`}
      >
        {stock.diff14dPp != null
          ? `${stock.diff14dPp > 0 ? '+' : ''}${stock.diff14dPp.toFixed(2).replace('.', ',')} p.p.`
          : '—'}
      </td>

      {/* ZAKUPY 90D */}
      <td className="py-3 px-3 text-right font-mono text-xs">
        {stock.buys90dCount != null && stock.buys90dCount > 0 ? (
          <span className="font-bold text-warning">{stock.buys90dCount}</span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>

      {/* SYGNAŁ */}
      <td className="py-3 px-3 text-left font-mono text-2xs">
        {stock.signal ? (
          <div className="flex items-center gap-1.5 text-danger font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-danger shrink-0 inline-block" />
            <span>{stock.signal}</span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>

      {/* 12M SPARKLINE */}
      <td className="py-3 px-3 text-right">
        <div className="w-18 h-6 ml-auto shrink-0 flex items-center justify-end">
          {pathPoints ? (
            <svg width="68" height="22" className="overflow-visible">
              <polyline
                fill="none"
                stroke={isPositive12m ? 'var(--color-success)' : 'var(--color-danger)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pathPoints}
              />
            </svg>
          ) : (
            <span className="text-3xs text-text-muted font-mono">—</span>
          )}
        </div>
      </td>

      {/* WATCHLIST STAR */}
      <td className="py-3 px-2 text-center">
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist(stock.ticker);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onToggleWatchlist(stock.ticker);
            }
          }}
          className="p-1 rounded-md text-text-muted hover:text-text-primary transition-colors cursor-pointer inline-flex items-center justify-center"
        >
          <Star
            size={15}
            className={
              isWatched
                ? 'fill-warning text-warning'
                : 'text-text-muted hover:text-text-secondary'
            }
          />
        </div>
      </td>
    </tr>
  );
};
