import { FC } from 'react';
import { DashboardData } from '../../lib/investments/dashboardService';

interface Props {
  data: DashboardData;
  watchlistLength: number;
}

export const DashboardKpiStack: FC<Props> = ({ data, watchlistLength }) => {
  return (
    <div className="flex flex-col gap-3 justify-between h-full">
      {/* 1. NOWE ZDARZENIA / 14 DNI */}
      <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs flex-1 flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted">
          Nowe zdarzenia / 14 DNI
        </div>
        <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
          {data.watchlist14Count}
        </div>
        <div className="text-3xs text-text-secondary mt-1 font-mono">
          na {watchlistLength} spółkach watchlisty
        </div>
      </div>

      {/* 2. TOP KONSENSUS 13F */}
      <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs flex-1 flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted">
          Top konsensus 13F
        </div>
        <div className="text-2xl font-black text-success font-mono tabular-nums mt-1 flex items-baseline gap-1.5">
          <span>+{data.topConsensus.net}</span>
          <span className="text-text-primary text-xl">{data.topConsensus.ticker}</span>
        </div>
        <div className="text-3xs text-text-secondary mt-1 font-mono">
          mediana rynku 0
        </div>
      </div>

      {/* 3. MAX SHORT GPW */}
      <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs flex-1 flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted">
          Max short GPW
        </div>
        <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1 flex items-baseline gap-1.5">
          <span>{data.maxShort.totalPct.toFixed(2).replace('.', ',')}%</span>
          <span className="text-lg font-bold text-text-secondary">{data.maxShort.company}</span>
        </div>
        <div className="text-3xs text-danger mt-1 font-mono">
          +{data.maxShort.delta14d.toFixed(2).replace('.', ',')} p.p. / 14 dni
        </div>
      </div>

      {/* 4. TRANSAKCJE KONGRESU */}
      <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs flex-1 flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted">
          Transakcje Kongresu
        </div>
        <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
          {data.congress14.total}
        </div>
        <div className="text-3xs text-text-secondary mt-1 font-mono">
          sprzedaże: {data.congress14.sales}
        </div>
      </div>
    </div>
  );
};
