import { FC } from 'react';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

interface Props {
  data: CompanyDetailData;
}

export const CompanyKpiGrid: FC<Props> = ({ data }) => {
  const net = data.consensus.buyers - data.consensus.sellers;
  const netLabel = net > 0 ? `+${net}` : `${net}`;
  const netColor = net > 0 ? 'text-success' : net < 0 ? 'text-danger' : 'text-text-muted';

  const formatTotalValue = (val: number) => {
    if (!val || val === 0) return '—';
    if (val >= 1e9) return `${(val / 1e9).toFixed(1).replace('.', ',')} mld USD`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace('.', ',')} mln USD`;
    return `$${val.toLocaleString()}`;
  };

  const kpis = [
    {
      title: 'KONSENSUS NETTO',
      value: netLabel,
      valueClass: netColor,
      subtitle: `${data.consensus.buyers} kupiło · ${data.consensus.sellers} sprzedało`,
    },
    {
      title: 'FUNDUSZY Z POZYCJĄ',
      value: `${data.consensus.holders}`,
      valueClass: 'text-text-primary',
      subtitle: 'ostatni kwartał 13F',
    },
    {
      title: 'POLITYCY KUPUJĄCY',
      value: `${data.politicians.buyersCount}`,
      valueClass: data.politicians.buyersCount > 0 ? 'text-success' : 'text-text-primary',
      subtitle: 'ujawnienia z 90 dni',
    },
    {
      title: 'INSIDERZY: KUPNA / SPRZEDAŻE',
      value: `${data.insiders.buysCount} / ${data.insiders.sellsCount}`,
      valueClass: 'text-text-primary',
      subtitle: 'wg formularzy SEC Form 4',
    },
    {
      title: 'NOWE POZYCJE',
      value: `${data.consensus.newPositions}`,
      valueClass: data.consensus.newPositions > 0 ? 'text-success' : 'text-text-primary',
      subtitle: 'fundusze bez wcześniejszej pozycji',
    },
    {
      title: 'ŁĄCZNA WARTOŚĆ',
      value: formatTotalValue(data.consensus.totalValueUsd),
      valueClass: 'text-text-primary',
      subtitle: 'suma pozycji 13F w tym tickerze',
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
