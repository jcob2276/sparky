import { FC, useMemo } from 'react';
import { SuperinvestorOverviewItem } from '../../lib/investments/superinvestorDetailService';
import { SuperinvestorAvatar } from './SuperinvestorAvatar';

interface Props {
  investor: SuperinvestorOverviewItem;
  onClick: () => void;
}

export const SuperinvestorCard: FC<Props> = ({ investor, onClick }) => {
  // Sparkline SVG path calculation
  const sparklinePath = useMemo(() => {
    const points = investor.sparkline;
    if (!points || points.length < 2) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 110;
    const height = 34;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return coords.join(' ');
  }, [investor.sparkline]);

  const lineColor = investor.isPositiveTrend ? 'var(--color-success)' : 'var(--color-danger)';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="p-4 sm:p-5 rounded-3xl bg-surface border border-border-custom hover:border-primary/50 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between space-y-4"
    >
      {/* Top Header: Avatar + Names */}
      <div className="flex items-start gap-3 min-w-0">
        <SuperinvestorAvatar
          name={investor.name}
          fundName={investor.fundName}
          slug={investor.slug}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-text-primary tracking-tight truncate group-hover:text-primary transition-colors">
            {investor.name}
          </h3>
          <p className="text-3xs text-text-muted truncate mt-0.5">
            {investor.fundName}
          </p>
        </div>
      </div>

      {/* Middle: AUM & Sparkline */}
      <div className="flex items-end justify-between gap-2 pt-1">
        <div>
          <div className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
            {investor.aumFormatted.split(' ')[0]}
            <span className="text-xs font-semibold text-text-muted ml-1">
              {investor.aumFormatted.split(' ').slice(1).join(' ')}
            </span>
          </div>
          <div className="text-3xs font-mono font-medium text-text-muted uppercase tracking-wider mt-0.5">
            USD
          </div>
        </div>

        {/* SVG Sparkline */}
        <div className="w-28 h-9 shrink-0 flex items-center justify-end">
          {sparklinePath ? (
            <svg width="110" height="34" className="overflow-visible">
              <polyline
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePath}
              />
            </svg>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xs text-text-muted">
              —
            </div>
          )}
        </div>
      </div>

      {/* Bottom Metadata */}
      <div className="pt-2 border-t border-border-custom/50 flex items-center justify-between text-3xs font-mono text-text-secondary">
        <span>
          {investor.positionsCount} pozycji · {investor.category}
        </span>
        <span className="text-text-muted">{investor.filingDate}</span>
      </div>
    </div>
  );
};
