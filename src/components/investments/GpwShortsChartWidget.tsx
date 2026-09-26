import { FC, useMemo } from 'react';
import { GpwShortChartData } from '../../lib/investments/gpwShortsService';

interface Props {
  data: GpwShortChartData;
  isTopRanked?: boolean;
}

export const GpwShortsChartWidget: FC<Props> = ({ data, isTopRanked = true }) => {
  const { shortLinePoints, shortAreaPoints, pricePoints } = useMemo(() => {
    const pts = data.points;
    if (!pts || pts.length < 2) {
      return { shortLinePoints: '', shortAreaPoints: '', pricePoints: '' };
    }

    const w = 270;
    const n = pts.length;

    // Price scaling: Y from 55 to 105
    const prices = pts.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = maxP - minP || 1;

    const pCoords = pts.map((p, i) => {
      const x = (i / (n - 1)) * w + 10;
      const y = 105 - ((p.price - minP) / rangeP) * 50;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Short scaling: Y from 12 to 42
    const shorts = pts.map((p) => p.shortPct);
    const minS = Math.min(...shorts);
    const maxS = Math.max(...shorts);
    const rangeS = maxS - minS || 1;

    const sCoords = pts.map((p, i) => {
      const x = (i / (n - 1)) * w + 10;
      const y = 42 - ((p.shortPct - minS) / rangeS) * 28;
      return { x, y, str: `${x.toFixed(1)},${y.toFixed(1)}` };
    });

    const sLine = sCoords.map((c) => c.str).join(' ');
    const sArea = `10,48 ${sLine} 280,48`;

    return {
      shortLinePoints: sLine,
      shortAreaPoints: sArea,
      pricePoints: pCoords.join(' '),
    };
  }, [data.points]);

  return (
    <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text-primary tracking-tight font-mono">
          {data.ticker}: short vs kurs
        </h4>
        {isTopRanked && (
          <span className="text-3xs uppercase tracking-wider font-mono text-text-muted">
            Największy short w rankingu
          </span>
        )}
      </div>

      {/* SVG Dual-Axis Chart */}
      <div className="w-full relative h-36 bg-surface-subtle/30 rounded-xl overflow-hidden border border-border-custom/30 p-2">
        <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="shortGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-danger)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-danger)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Price curve (gray) */}
          {pricePoints && (
            <polyline
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="1.2"
              strokeOpacity="0.6"
              strokeLinejoin="round"
              points={pricePoints}
            />
          )}

          {/* Short area fill */}
          {shortAreaPoints && (
            <polygon fill="url(#shortGradient)" points={shortAreaPoints} />
          )}

          {/* Short curve (red) */}
          {shortLinePoints && (
            <polyline
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={shortLinePoints}
            />
          )}

          {/* Right Y-axis labels */}
          <text
            x="315"
            y="18"
            textAnchor="end"
            className="text-3xs font-mono font-bold fill-danger"
          >
            {data.shortPct.toFixed(2)}%
          </text>
          <text
            x="315"
            y="65"
            textAnchor="end"
            className="text-3xs font-mono fill-text-muted"
          >
            {data.latestPrice.toFixed(2).replace('.', ',')}
          </text>

          {/* Bottom X-axis date labels */}
          <text x="10" y="116" className="text-4xs font-mono fill-text-muted">
            {data.startDateLabel}
          </text>
          <text x="280" y="116" textAnchor="end" className="text-4xs font-mono fill-text-muted">
            {data.endDateLabel}
          </text>
        </svg>
      </div>

      {/* Footer Caption */}
      <div className="text-2xs font-mono text-text-secondary">
        {data.ticker}: short {data.shortPct.toFixed(2)}% · kurs{' '}
        {data.latestPrice.toFixed(2).replace('.', ',')} zł · 90 dni
      </div>
    </div>
  );
};
