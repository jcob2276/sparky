import { FC, useState, useCallback, useEffect } from 'react';
import { formatDashboardDate } from '../../lib/date';
import { loadStoredWatchlist, saveStoredWatchlist } from '../../lib/investments/watchlistStorage';
import { fetchDashboardData, DashboardData } from '../../lib/investments/dashboardService';
import { DashboardWatchlistBuilder } from './DashboardWatchlistBuilder';
import { DashboardEqualWeightChart } from './DashboardEqualWeightChart';
import { DashboardKpiStack } from './DashboardKpiStack';
import { DashboardActivityChart } from './DashboardActivityChart';
import { DashboardDisclosureStream } from './DashboardDisclosureStream';
import { DashboardBottomCards } from './DashboardBottomCards';

interface Props {
  onNavigateTab: (tab: string) => void;
}

const INITIAL_DATA: DashboardData = {
  topConsensus: { ticker: 'AMZN', net: 6 },
  maxShort: { company: 'MODIVO', ticker: 'MDV', totalPct: 6.01, delta14d: 1.57 },
  congress14: { total: 39, sales: 38, buys: 1 },
  watchlist14Count: 0,
  activity14d: {
    total: 4474,
    peakDateLabel: '16 WRZ',
    sources: { politicians: 62, funds: 0, insiders: 4401, shorts: 11 },
    days: [],
  },
  streamItems: [],
  topConvergenceUsa: [],
};

export const OrcaDashboardView: FC<Props> = ({ onNavigateTab }) => {
  const [watchlist, setWatchlist] = useState<string[]>(loadStoredWatchlist);
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [builderDismissed, setBuilderDismissed] = useState(false);

  const handleToggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      saveStoredWatchlist(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    fetchDashboardData(watchlist).then((res) => {
      if (active) setData(res);
    });

    return () => {
      active = false;
    };
  }, [watchlist]);

  const todayLabel = formatDashboardDate().toUpperCase();

  return (
    <div className="space-y-4 animate-fade-in text-text-primary">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
          <span>PULPIT {todayLabel} CEST</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-3xs font-bold text-success uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
          <span>live · dane aktualne</span>
        </div>
      </div>

      {/* Dziś w skrócie Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-custom shadow-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-3xs font-mono font-bold uppercase tracking-wider text-success">
            Dziś w skrócie
          </span>
        </div>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-5xl">
          Najsilniejszy konsensus funduszy i polityków ma{' '}
          <strong className="text-text-primary font-mono font-bold">
            {data.topConsensus.ticker}
          </strong>{' '}
          z wynikiem{' '}
          <strong className="text-success font-mono font-bold">
            +{data.topConsensus.net}
          </strong>
          . Na GPW pozycja krótka na{' '}
          <strong className="text-text-primary font-mono font-bold">
            {data.maxShort.company}
          </strong>{' '}
          wzrosła o{' '}
          <strong className="text-danger font-mono font-bold">
            +{data.maxShort.delta14d.toFixed(2).replace('.', ',')} p.p.
          </strong>
          .
        </p>
      </div>

      {/* Watchlist Builder (if not dismissed and watchlist is small) */}
      {!builderDismissed && watchlist.length < 3 && (
        <DashboardWatchlistBuilder
          watchlist={watchlist}
          onToggle={handleToggleWatchlist}
          onDismiss={() => setBuilderDismissed(true)}
        />
      )}

      {/* 2-Column: Equal-Weight Index (col-span-8) vs 4 KPI Cards (col-span-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        <div className="col-span-1 lg:col-span-8">
          <DashboardEqualWeightChart
            watchlist={watchlist}
            onNavigateToWatchlist={() => onNavigateTab('watchlist')}
          />
        </div>
        <div className="col-span-1 lg:col-span-4">
          <DashboardKpiStack data={data} watchlistLength={watchlist.length} />
        </div>
      </div>

      {/* 2-Column: Activity 14D (col-span-5) vs Disclosure Stream (col-span-7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        <div className="col-span-1 lg:col-span-5">
          <DashboardActivityChart activity={data.activity14d} />
        </div>
        <div className="col-span-1 lg:col-span-7">
          <DashboardDisclosureStream
            items={data.streamItems}
            onViewAll={() => onNavigateTab('live')}
          />
        </div>
      </div>

      {/* 3-Column: Top Zbieżność USA, Zbieżność GPW, Kalendarz Ujawnień */}
      <DashboardBottomCards
        topConvergence={data.topConvergenceUsa}
        onNavigateTab={onNavigateTab}
      />

      {/* Legal Disclaimer */}
      <div className="pt-4 border-t border-border-custom/30 text-3xs text-text-muted leading-relaxed">
        Serwis ma charakter wyłącznie informacyjno-edukacyjny. Prezentowane dane pochodzą z publicznych źródeł (formularze 13F SEC, ujawnienia STOCK Act). Serwis nie świadczy usług doradztwa inwestycyjnego ani zarządzania portfelem. Wyniki historyczne nie stanowią gwarancji przyszłych wyników. Każda decyzja inwestycyjna jest wyłączną decyzją użytkownika.
      </div>
    </div>
  );
};
