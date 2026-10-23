import { FC } from 'react';
import { Clock } from 'lucide-react';
import type { PoliticianDetail } from '../../lib/investments/congressService';
import {
  formatDatePl, formatUsdShort, STOCK_ACT_DEADLINE_DAYS,
} from '../../lib/investments/congressTradeFormat';

export const PoliticianKpiCards: FC<{ detail: PoliticianDetail }> = ({ detail }) => {
  const kpis = [
    { label: 'UJAWNIENIA YTD', val: `${detail.totalDisclosures}` },
    { label: 'KUPNA / SPRZEDAŻE', val: `${detail.buysCount} / ${detail.sellsCount}` },
    { label: 'WOLUMEN ~ (ŚRODEK WIDEŁEK)', val: formatUsdShort(detail.totalVolumeUsd) },
    { label: 'WIDEŁKI ŁĄCZNIE', val: `${formatUsdShort(detail.rangeLowUsd)} - ${formatUsdShort(detail.rangeHighUsd)}` },
    { label: 'OSTATNIA TRANSAKCJA', val: formatDatePl(detail.lastTradeDate) },
    { label: 'OSTATNIE UJAWNIENIE', val: formatDatePl(detail.lastDisclosureDate) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-2xs font-semibold text-text-muted">{kpi.label}</div>
          <div className="mt-2 font-mono font-semibold text-lg tabular-nums truncate text-text-primary" title={kpi.val}>{kpi.val}</div>
        </div>
      ))}
    </div>
  );
};

/** Opóźnienie zgłoszeń + uczciwa informacja o braku alfy (zamiast zmyślonego zwrotu). */
export const PoliticianDisclosureCard: FC<{ detail: PoliticianDetail }> = ({ detail }) => (
  <div className="bg-surface-elevated border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
    <div className="flex items-center gap-2">
      <Clock size={16} className="text-primary" />
      <h3 className="text-xs font-semibold text-text-primary">Terminowość ujawnień · od {formatDatePl(detail.since)}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-surface-subtle border border-border-custom/50 rounded-xl p-3.5 space-y-1">
        <div className="text-2xs font-mono text-text-muted">Mediana opóźnienia</div>
        <div className="text-xl font-semibold font-mono text-text-primary">
          {detail.medianDelayDays == null ? '—' : `${detail.medianDelayDays} dni`}
        </div>
      </div>
      <div className="bg-surface-subtle border border-border-custom/50 rounded-xl p-3.5 space-y-1">
        <div className="text-2xs font-mono text-text-muted">Po terminie (&gt; {STOCK_ACT_DEADLINE_DAYS} dni)</div>
        <div className={`text-xl font-semibold font-mono ${detail.lateCount ? 'text-danger' : 'text-text-primary'}`}>
          {detail.lateCount} z {detail.totalDisclosures}
        </div>
      </div>
      <div className="bg-surface-subtle border border-border-custom/50 rounded-xl p-3.5 space-y-1">
        <div className="text-2xs font-mono text-text-muted">Alfa vs S&amp;P 500</div>
        <div className="text-sm font-medium text-text-muted">Niedostępna: baza ma ceny tylko dla części spółek, nie zgadujemy wyniku.</div>
      </div>
    </div>
  </div>
);
