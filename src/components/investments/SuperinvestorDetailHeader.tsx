import { FC } from 'react';
import { SuperinvestorOverviewItem } from '../../lib/investments/superinvestorDetailService';
import { SuperinvestorAvatar } from './SuperinvestorAvatar';

interface Props {
  investor: SuperinvestorOverviewItem;
  basketValueFormatted: string;
  positionsCount: number;
  newCount: number;
  soldCount: number;
}

export const SuperinvestorDetailHeader: FC<Props> = ({
  investor,
  basketValueFormatted,
  positionsCount,
  newCount,
  soldCount,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header Profile */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SuperinvestorAvatar
            name={investor.name}
            fundName={investor.fundName}
            slug={investor.slug}
            size="lg"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight uppercase">
              {investor.name}
            </h1>
            <div className="text-3xs uppercase tracking-wider font-mono font-bold text-text-muted mt-0.5">
              {investor.fundName} · {investor.category} · UJAWNIENIA 13F OD 2023
            </div>
          </div>
        </div>

        <div className="self-start md:self-auto">
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-black font-mono tracking-tight bg-success/10 text-success border border-success/30 shadow-2xs">
            PORTFEL 13F: {investor.aumFormatted.toUpperCase()}
          </span>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Wartość Koszyka
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-1">
            {basketValueFormatted}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Pozycje
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-1">
            {positionsCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Nowe Pozycje
          </div>
          <div className="text-xl sm:text-2xl font-black text-success tracking-tight mt-1">
            {newCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Sprzedane
          </div>
          <div className="text-xl sm:text-2xl font-black text-danger tracking-tight mt-1">
            {soldCount}
          </div>
        </div>
      </div>

      {/* Bio Description */}
      {investor.description && (
        <div className="text-xs text-text-secondary leading-relaxed bg-surface/50 p-4 rounded-2xl border border-border-custom/50">
          {investor.description}
        </div>
      )}
    </div>
  );
};
