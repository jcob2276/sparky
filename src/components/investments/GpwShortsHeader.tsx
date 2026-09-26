import { FC } from 'react';
import { GpwShortsKpis } from '../../lib/investments/gpwShortsService';

interface Props {
  kpis: GpwShortsKpis;
  onNavigateTab?: (tab: string) => void;
}

export const GpwShortsHeader: FC<Props> = ({ kpis, onNavigateTab }) => {
  return (
    <div className="space-y-4">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          Krótka sprzedaż na GPW
        </h1>
        <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">
          Publiczny rejestr pozycji krótkich netto KNF: fundusze muszą ujawniać pozycje od 0,5% kapitału spółki.
        </p>
      </div>

      {/* 3 Sub-tabs */}
      <div className="flex items-center gap-6 border-b border-border-custom/50 pt-1">
        <div className="pb-3 text-xs sm:text-sm font-bold text-primary border-b-2 border-primary cursor-default">
          Krótka sprzedaż
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab?.('stocks')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab?.('stocks')}
          className="pb-3 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Insiderzy (ESPI)
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab?.('methodology')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab?.('methodology')}
          className="pb-3 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Fundamenty
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
          <div className="text-3xs uppercase font-mono tracking-wider text-text-muted">
            Spółek pod presją shortów
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-text-primary mt-1">
            {kpis.totalCompanies}
          </div>
        </div>

        <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
          <div className="text-3xs uppercase font-mono tracking-wider text-text-muted">
            Aktywnych pozycji publicznych
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-text-primary mt-1">
            {kpis.activePositions}
          </div>
        </div>

        <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
          <div className="text-3xs uppercase font-mono tracking-wider text-text-muted">
            Największy łączny short
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-danger mt-1">
            {kpis.highestShortPct.toFixed(2)}%
          </div>
          <div className="text-3xs font-mono text-text-muted mt-0.5">
            {kpis.highestShortTicker}
          </div>
        </div>

        <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
          <div className="text-3xs uppercase font-mono tracking-wider text-text-muted">
            Ostatnia zmiana w rejestrze
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-text-primary mt-1.5">
            {kpis.lastRegisterChange}
          </div>
        </div>
      </div>
    </div>
  );
};
