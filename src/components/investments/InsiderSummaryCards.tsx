import { FC } from 'react';
import { InsiderSummaryStats } from '../../lib/investments/insidersService';

interface Props {
  stats: InsiderSummaryStats;
}

export const InsiderSummaryCards: FC<Props> = ({ stats }) => {
  return (
    <div className="space-y-4">
      {/* Title & Badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
            Transakcje insiderów
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">
            Zakupy i sprzedaże raportowane przez kadrę zarządzającą i członków rad (SEC Form 4). Dane
            wprost z EDGAR, z opóźnieniem wynikającym z terminu raportowania.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-md text-3xs font-mono font-black tracking-wider uppercase bg-warning/15 text-warning border border-warning/30 shrink-0">
          FORM 4
        </span>
      </div>

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-1">
        {/* Card 1: Zakupy / Sprzedaże */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-1">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Zakupy / Sprzedaże
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            {stats.purchasesCount} <span className="text-text-muted font-light">/</span> {stats.salesCount}
          </div>
          <div className="text-3xs font-mono text-text-secondary pt-0.5">
            rynek 90d: {stats.marketPurchases90d.toLocaleString('pl-PL')} / {stats.marketSales90d.toLocaleString('pl-PL')} ·{' '}
            <span className="text-success font-bold">{stats.marketDeltaPoints}</span>
          </div>
        </div>

        {/* Card 2: Najaktywniejsza spółka */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-1">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Najaktywniejsza Spółka
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            {stats.mostActiveTicker}{' '}
            <span className="text-sm sm:text-base font-bold text-text-muted font-mono">
              · {stats.mostActiveFilingCount} wpisów
            </span>
          </div>
          <div className="text-3xs font-mono text-text-secondary pt-0.5">
            mediana/spółkę: {stats.medianPerCompany}
          </div>
        </div>

        {/* Card 3: Tempo zgłoszeń */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-1">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Tempo Zgłoszeń
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            {stats.runRate30d.toLocaleString('pl-PL')}{' '}
            <span className="text-sm sm:text-base font-bold text-text-muted font-mono">
              / 30 dni
            </span>
          </div>
          <div className="text-3xs font-mono text-text-secondary pt-0.5">
            śr. miesięczna (90d): {stats.avgMonthly90d.toLocaleString('pl-PL')} ·{' '}
            <span className="text-success font-bold">{stats.runRateGrowthPct}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
