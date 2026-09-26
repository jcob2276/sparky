import { FC, useMemo } from 'react';
import { GpwCompanyFundamental } from '../../lib/investments/gpwFundamentalsService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  company: GpwCompanyFundamental;
  onSelect: (ticker: string) => void;
}

function fmtVal(val: number | null, decimals = 1, suffix = ''): string {
  if (val == null) return '—';
  return `${val.toFixed(decimals).replace('.', ',')}${suffix ? ` ${suffix}` : ''}`;
}

export const GpwFundamentalRow: FC<Props> = ({ company: c, onSelect }) => {
  // Sparkline SVG calculation with end dot
  const { pathPoints, lastPoint } = useMemo(() => {
    const pts = c.quarters8;
    if (!pts || pts.length < 2) return { pathPoints: '', lastPoint: null };
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const w = 72;
    const h = 26;

    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 6) - 3;
      return { x, y, str: `${x.toFixed(1)},${y.toFixed(1)}` };
    });

    return {
      pathPoints: coords.map((pt) => pt.str).join(' '),
      lastPoint: coords[coords.length - 1],
    };
  }, [c.quarters8]);

  const isPositiveGrowth = (c.revenueYoyPct || 0) >= 0;

  return (
    <tr
      onClick={() => onSelect(c.ticker)}
      className="hover:bg-surface-elevated/40 transition-colors cursor-pointer group"
    >
      {/* Spółka: Logo + Ticker + Nazwa/Sektor */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          <CompanyLogo ticker={c.ticker} name={c.name} size={30} />
          <div className="min-w-0">
            <div className="font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
              {c.ticker}
            </div>
            <div className="text-3xs text-text-muted truncate max-w-40 sm:max-w-56">
              {c.name} · {c.sectorPl}
            </div>
          </div>
        </div>
      </td>

      {/* Kap. Mld Zł */}
      <td className="py-3 px-3 text-right font-black text-text-primary font-mono text-xs sm:text-sm">
        {fmtVal(c.mcapMld, 1)}
      </td>

      {/* C/Z */}
      <td className="py-3 px-3 text-right font-bold text-text-primary font-mono text-xs">
        {fmtVal(c.pe, 1)}
      </td>

      {/* C/WK */}
      <td className="py-3 px-3 text-right text-text-secondary font-mono text-xs">
        {fmtVal(c.pb, 2)}
      </td>

      {/* Stopa Dyw. */}
      <td className="py-3 px-3 text-right font-medium text-text-secondary font-mono text-xs">
        {fmtVal(c.divYieldPct, 1, '%')}
      </td>

      {/* ROE */}
      <td className="py-3 px-3 text-right font-medium text-text-secondary font-mono text-xs">
        {fmtVal(c.roePct, 1, '%')}
      </td>

      {/* Marża Netto */}
      <td className="py-3 px-3 text-right text-text-secondary font-mono text-xs">
        {fmtVal(c.netMarginPct, 1, '%')}
      </td>

      {/* Przych. R/R */}
      <td
        className={`py-3 px-3 text-right font-bold font-mono text-xs ${
          isPositiveGrowth ? 'text-success' : 'text-danger'
        }`}
      >
        {c.revenueYoyPct != null
          ? `${c.revenueYoyPct > 0 ? '+' : ''}${c.revenueYoyPct} %`
          : '—'}
      </td>

      {/* Przychody 8 Okr. (Sparkline SVG z kropką końcową) */}
      <td className="py-3 px-3 text-right">
        <div className="w-20 h-7 ml-auto shrink-0 flex items-center justify-end">
          {pathPoints ? (
            <svg width="72" height="26" className="overflow-visible">
              <polyline
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pathPoints}
              />
              {lastPoint && (
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="2.5"
                  fill="var(--color-primary)"
                />
              )}
            </svg>
          ) : (
            <span className="text-3xs text-text-muted font-mono">—</span>
          )}
        </div>
      </td>
    </tr>
  );
};
