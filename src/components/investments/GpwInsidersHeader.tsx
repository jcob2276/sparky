import { FC } from 'react';
import { GpwInsiderKpis } from '../../lib/investments/gpwInsidersService';

interface Props {
  kpis: GpwInsiderKpis;
  onNavigateTab?: (tab: string) => void;
}

export const GpwInsidersHeader: FC<Props> = ({ kpis, onNavigateTab }) => {
  return (
    <div className="space-y-4">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          Insiderzy GPW (ESPI)
        </h1>
        <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">
          Transakcje osób pełniących obowiązki zarządcze w spółkach z GPW: zawiadomienia MAR art. 19 publikowane przez ESPI, z linkiem do każdego raportu źródłowego.
        </p>
      </div>

      {/* 3 Sub-tabs */}
      <div className="flex items-center gap-6 border-b border-border-custom/50 pt-1">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab?.('gpw_shorts')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab?.('gpw_shorts')}
          className="pb-3 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Krótka sprzedaż
        </div>
        <div className="pb-3 text-xs sm:text-sm font-bold text-primary border-b-2 border-primary cursor-default">
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

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
        <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
          <div className="text-3xs uppercase font-mono tracking-wider text-text-muted">
            Nabycia / Zbycia
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-text-primary mt-1">
            {kpis.purchases} / {kpis.sales}
          </div>
          <div className="text-3xs font-mono text-text-muted mt-0.5">
            rynek 90d: {kpis.market90dPurchases} / {kpis.market90dSales} · {kpis.marketDeltaPoints}
          </div>
        </div>

        <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
          <div className="text-3xs uppercase font-mono tracking-wider text-text-muted">
            Najaktywniejsza spółka
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-text-primary mt-1">
            {kpis.mostActiveTicker} · {kpis.mostActiveCount}
          </div>
          <div className="text-3xs font-mono text-text-muted mt-0.5">
            mediana/spółkę: {kpis.medianPerCompany}
          </div>
        </div>

        <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
          <div className="text-3xs uppercase font-mono tracking-wider text-text-muted">
            Tempo zgłoszeń
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-text-primary mt-1">
            {kpis.tempo30d} / 30 dni
          </div>
          <div className="text-3xs font-mono text-text-muted mt-0.5">
            śr. miesięczna 90d: {kpis.tempoAvg90d} · {kpis.tempoGrowthPct}
          </div>
        </div>
      </div>
    </div>
  );
};
