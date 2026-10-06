import { FC } from 'react';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

interface Props {
  data: CompanyDetailData;
}

export const CompanyKpiGrid: FC<Props> = ({ data }) => {
  const latest = data.fundHistory[0];
  const periodLabel = latest ? `Stan na ${latest.period_of_report}; odczytane raporty SEC` : 'Brak zweryfikowanego okresu raportu';
  const changes = data.fundChanges;
  const comparisonLabel = changes ? `${changes.previousPeriod} → ${changes.period}; ${changes.comparedFunds} porównanych funduszy` : 'Wymaga dwóch kolejnych raportów tego samego funduszu';

  const formatTotalValue = (val: number) => {
    if (!val || val === 0) return '—';
    if (val >= 1e9) return `${(val / 1e9).toFixed(1).replace('.', ',')} mld USD`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace('.', ',')} mln USD`;
    return `$${val.toLocaleString()}`;
  };

  const kpis = [
    {
      title: 'ZMIANA RAPORTOWANYCH AKCJI',
      value: changes ? `${changes.increases} ↑ / ${changes.decreases} ↓` : '—',
      valueClass: 'text-text-muted',
      subtitle: comparisonLabel,
    },
    {
      title: 'FUNDUSZY Z POZYCJĄ',
      value: latest ? `${latest.reported_holders}` : '—',
      valueClass: 'text-text-primary',
      subtitle: periodLabel,
    },
    {
      title: 'KONGRES: TRANSAKCJE ZAKUPU',
      value: `${data.politicians.buyersCount}`,
      valueClass: data.politicians.buyersCount > 0 ? 'text-success' : 'text-text-primary',
      subtitle: 'w odczycie do 50 ostatnich transakcji',
    },
    {
      title: 'INSIDERZY: KUPNA / SPRZEDAŻE',
      value: `${data.insiders.buysCount} / ${data.insiders.sellsCount}`,
      valueClass: 'text-text-primary',
      subtitle: 'kody P / S; do 50 transakcji, bez instrumentów pochodnych i korekt',
    },
    {
      title: 'NOWO WYKAZANE POZYCJE',
      value: changes ? `${changes.newReported}` : '—',
      valueClass: 'text-text-muted',
      subtitle: comparisonLabel,
    },
    {
      title: 'ŁĄCZNA WARTOŚĆ',
      value: latest ? formatTotalValue(latest.reported_value_usd) : '—',
      valueClass: 'text-text-primary',
      subtitle: periodLabel,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between"
        >
          <div className="text-3xs font-black uppercase tracking-wider text-text-muted">
            {kpi.title}
          </div>
          <div className="my-2.5">
            <div className={`text-2xl font-black font-mono tracking-tight tabular-nums ${kpi.valueClass}`}>
              {kpi.value}
            </div>
          </div>
          <div className="text-2xs text-text-muted">
            {kpi.subtitle}
          </div>
        </div>
      ))}
    </div>
  );
};
