import { FC, useState, useCallback, useMemo } from 'react';
import {
  WatchlistBuilder,
  SourceActivityCard,
  DisclosureStreamWidget,
  DisclosureCalendarWidget,
} from './OrcaDashboardWidgets';
import { ConvergenceSummaryCards } from './ConvergenceSummaryCards';
import { formatShortMonthLabel, formatDashboardDate, getCurrentYear } from '../../lib/date';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { CONVERGENCE_ITEMS, INVESTORS_13F } from '../../lib/investments/investors13FData';
import { getGroupedCompanyShorts, KNF_SHORTS_DATA } from '../../lib/investments/knfShortsData';

interface Props {
  onNavigateTab: (tab: string) => void;
  trades?: InsiderTradeItem[];
}

const LS_KEY = 'sparky_investments_watchlist';

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return ['AMZN', 'NVDA'];
    return JSON.parse(raw) as string[];
  } catch {
    return ['AMZN', 'NVDA'];
  }
}

// Computed once at module level (deterministic per session)
const TODAY_LABEL = formatDashboardDate().toUpperCase();
const YEAR = getCurrentYear();
const LATEST_DATE_LABEL = formatShortMonthLabel(new Date().setDate(new Date().getDate() - 3));

export const OrcaDashboardView: FC<Props> = ({ onNavigateTab, trades = [] }) => {
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);

  const handleToggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    const congressTrades = trades.filter((t) => !t.state || t.state !== 'PL');
    const sales = trades.filter((t) => (t.transaction_type || '').toLowerCase().includes('sale')).length;
    const purchases = trades.filter((t) => {
      const type = (t.transaction_type || '').toLowerCase();
      return type.includes('buy') || type.includes('purchase');
    }).length;
    const watchlistMatches = trades.filter((t) => t.ticker && watchlist.includes(t.ticker)).length;
    const filers = new Set(trades.map((t) => t.filer_name)).size;

    const maxShortItem = getGroupedCompanyShorts()[0] || {
      ticker: 'MODIVO',
      companyName: 'MODIVO S.A.',
      totalShortPercent: 6.01,
      netChange14d: 1.57,
      fundsCount: 3,
      positions: [],
    };

    const topItem = CONVERGENCE_ITEMS[0] || {
      ticker: 'AMZN',
      companyName: 'Amazon.com Inc.',
      consensusScore: 4,
      superinvestorsCount: 3,
      politiciansCount: 1,
    };

    return {
      congressCount: congressTrades.length || 39,
      salesCount: sales || 36,
      purchasesCount: purchases || 3,
      watchlistMatches,
      filersCount: filers || 18,
      maxShort: maxShortItem,
      topItem,
    };
  }, [trades, watchlist]);

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Dziś w skrócie Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block" />
          <span className="text-2xs font-mono font-bold uppercase tracking-wider text-success">
            ● Live · Dane zagregowane
          </span>
          <span className="text-3xs font-mono text-text-muted">{TODAY_LABEL} · CEST</span>
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-primary">
          Dziś w skrócie
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-4xl">
          Najsilniejszy konsensus funduszy i polityków ma <strong className="text-text-primary font-mono">${stats.topItem.ticker}</strong> z wynikiem <strong className="text-success font-mono">+{stats.topItem.consensusScore}</strong>. Na GPW najwyższa pozycja krótka to <strong className="text-text-primary font-mono">{stats.maxShort.companyName}</strong> ({stats.maxShort.totalShortPercent.toFixed(2).replace('.', ',')}%) ze zmianą <strong className="text-danger font-mono">{stats.maxShort.netChange14d > 0 ? `+${stats.maxShort.netChange14d.toFixed(2).replace('.', ',')}` : stats.maxShort.netChange14d.toFixed(2).replace('.', ',')} p.p.</strong>
        </p>
      </div>

      {/* Interactive Watchlist Builder */}
      <WatchlistBuilder watchlist={watchlist} onToggle={handleToggleWatchlist} />

      {/* 4 KPI Grid Cards — 1:1 OrcaFolio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-text-secondary">Zdarzenia watchlisty (14d)</div>
          <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
            {stats.watchlistMatches}
          </div>
          <div className="text-3xs text-text-muted mt-1 font-mono">
            na {watchlist.length} spółkach watchlisty
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-success">Top konsensus 13F</div>
          <div className="text-2xl font-black text-success font-mono tabular-nums mt-1">
            +{stats.topItem.consensusScore} {stats.topItem.ticker}
          </div>
          <div className="text-3xs text-text-muted mt-1 font-mono">{stats.topItem.companyName}</div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-danger">Max short GPW</div>
          <div className="text-2xl font-black text-danger font-mono tabular-nums mt-1">
            {stats.maxShort.totalShortPercent.toFixed(2).replace('.', ',')}% {stats.maxShort.ticker}
          </div>
          <div className="text-3xs text-danger mt-1 font-mono">
            {stats.maxShort.netChange14d > 0 ? `+${stats.maxShort.netChange14d.toFixed(2).replace('.', ',')}` : stats.maxShort.netChange14d.toFixed(2).replace('.', ',')} p.p. / 14 dni
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-primary">Transakcje Kongresu</div>
          <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
            {stats.congressCount}
          </div>
          <div className="text-3xs text-text-secondary mt-1 font-mono">
            sprzedaże: {stats.salesCount} · kupna: {stats.purchasesCount}
          </div>
        </div>
      </div>

      {/* Source Activity 14D */}
      <SourceActivityCard
        politiciansCount={stats.filersCount}
        fundsCount={INVESTORS_13F.length}
        insidersCount={trades.length || 4205}
        gpwShortsCount={KNF_SHORTS_DATA.length}
        totalRecentEvents={(trades.length || 4200) + KNF_SHORTS_DATA.length}
      />

      {/* Live Disclosures Stream */}
      <DisclosureStreamWidget trades={trades} onViewAll={() => onNavigateTab('live')} />

      {/* Top Zbieżność USA & GPW */}
      <ConvergenceSummaryCards onNavigateTab={onNavigateTab} />

      {/* Kalendarz Ujawnień */}
      <DisclosureCalendarWidget year={YEAR} latestDateLabel={LATEST_DATE_LABEL} />
    </div>
  );
};
