import { FC, useState, useCallback, useEffect } from 'react';
import {
  WatchlistBuilder,
  SourceActivityCard,
  DisclosureStreamWidget,
  DisclosureCalendarWidget,
} from './OrcaDashboardWidgets';
import { ConvergenceSummaryCards } from './ConvergenceSummaryCards';
import { DisclosureDigest } from './DisclosureDigest';
import { formatShortMonthLabel, formatDashboardDate, getCurrentYear, getTodayWarsaw, shiftDateStr } from '../../lib/date';
import { useSignalBoard } from './useSignalBoard';
import { fetchLiveGpwShorts, orcaCount } from '../../lib/investments/superinvestorsApi';
import { loadStoredWatchlist, saveStoredWatchlist } from '../../lib/investments/watchlistStorage';

interface Props {
  onNavigateTab: (tab: string) => void;
}

interface DashStats {
  congress14: number;
  form414: number;
  salesCount: number;
  purchasesCount: number;
  filersCount: number;
  fundsCount: number;
  insidersCount: number;
  gpwShortsCount: number;
  maxShort: { ticker: string; companyName: string; totalShortPercent: number; fundsCount: number } | null;
}

const EMPTY_STATS: DashStats = {
  congress14: 0,
  form414: 0,
  salesCount: 0,
  purchasesCount: 0,
  filersCount: 0,
  fundsCount: 0,
  insidersCount: 0,
  gpwShortsCount: 0,
  maxShort: null,
};

// Computed once at module level (deterministic per session)
const TODAY_LABEL = formatDashboardDate().toUpperCase();
const YEAR = getCurrentYear();
const LATEST_DATE_LABEL = formatShortMonthLabel(new Date().setDate(new Date().getDate() - 3));

export const OrcaDashboardView: FC<Props> = ({ onNavigateTab }) => {
  const [watchlist, setWatchlist] = useState<string[]>(loadStoredWatchlist);
  const [stats, setStats] = useState<DashStats>(EMPTY_STATS);
  const { rows: signalRows } = useSignalBoard('90d');
  const topSignal = signalRows.find((row) => row.convergent) ?? signalRows[0] ?? null;
  const watchlistMatches = signalRows.filter((row) => watchlist.includes(row.ticker)).length;

  const handleToggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      saveStoredWatchlist(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    const since = shiftDateStr(getTodayWarsaw(), -14);
    (async () => {
      const [congress14, buys, sells, politicians, funds, insiders, form414, shorts] = await Promise.all([
        orcaCount(`stock_act_trades?select=id&disclosure_date=gte.${since}`),
        orcaCount('stock_act_trades?select=id&or=(transaction_type.eq.buy,transaction_type.eq.purchase)'),
        orcaCount('stock_act_trades?select=id&or=(transaction_type.eq.sell,transaction_type.eq.sale)'),
        orcaCount('politicians?select=id'),
        orcaCount('investors?select=id&is_active=eq.true'),
        orcaCount('vw_insider_public?select=id'),
        orcaCount(`vw_insider_public?select=id&filing_date=gte.${since}`),
        fetchLiveGpwShorts(),
      ]);
      if (!active) return;
      const top = shorts[0];
      setStats({
        congress14,
        form414,
        purchasesCount: buys,
        salesCount: sells,
        filersCount: politicians,
        fundsCount: funds,
        insidersCount: insiders,
        gpwShortsCount: shorts.length,
        maxShort: top
          ? {
              ticker: top.ticker,
              companyName: top.companyName,
              totalShortPercent: top.totalShortPercent,
              fundsCount: top.fundsCount,
            }
          : null,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

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
          {topSignal
            ? <>Najwyższa zbieżność ujawnień w oknie 90 dni: <strong className="text-text-primary font-mono">{topSignal.ticker}</strong>, ocena <strong className="text-success font-mono">{topSignal.score}</strong>.</>
            : <>Brak zbieżności funduszy i polityków w oknie 90 dni.</>}
          {stats.maxShort
            ? <> Najwyższa publiczna pozycja krótka GPW: <strong className="text-text-primary font-mono">{stats.maxShort.ticker}</strong> ({stats.maxShort.totalShortPercent.toFixed(2).replace('.', ',')}%).</>
            : <> Rejestr krótkiej sprzedaży GPW nie zwrócił pozycji.</>}
        </p>
      </div>

      {/* Interactive Watchlist Builder */}
      <WatchlistBuilder watchlist={watchlist} onToggle={handleToggleWatchlist} />

      {/* 4 KPI Grid Cards — 1:1 OrcaFolio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-text-secondary">Zbieżności na watchliście</div>
          <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
            {watchlistMatches}
          </div>
          <div className="text-3xs text-text-muted mt-1 font-mono">
            na {watchlist.length} spółkach watchlisty
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-success">Top konsensus 13F</div>
          <div className="text-2xl font-black text-success font-mono tabular-nums mt-1">
            {topSignal ? `${topSignal.score} ${topSignal.ticker}` : '—'}
          </div>
          <div className="text-3xs text-text-muted mt-1 font-mono">{topSignal?.companyName ?? 'liczenie zbieżności'}</div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-danger">Max short GPW</div>
          <div className="text-2xl font-black text-danger font-mono tabular-nums mt-1">
            {stats.maxShort ? `${stats.maxShort.totalShortPercent.toFixed(2).replace('.', ',')}% ${stats.maxShort.ticker}` : '—'}
          </div>
          <div className="text-3xs text-danger mt-1 font-mono">
            {stats.maxShort ? `${stats.maxShort.fundsCount} funduszy` : 'brak pozycji'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-primary">Transakcje Kongresu</div>
          <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
            {stats.congress14}
          </div>
          <div className="text-3xs text-text-secondary mt-1 font-mono">
            14 dni · sprzedaże łącznie: {stats.salesCount} · kupna: {stats.purchasesCount}
          </div>
        </div>
      </div>

      {/* Source Activity 14D */}
      <SourceActivityCard
        politiciansCount={stats.filersCount}
        fundsCount={stats.fundsCount}
        insidersCount={stats.insidersCount}
        gpwShortsCount={stats.gpwShortsCount}
        totalRecentEvents={stats.congress14 + stats.form414}
      />

      <DisclosureStreamWidget onViewAll={() => onNavigateTab('politicians')} />

      <DisclosureDigest watchlist={watchlist} />

      {/* Top Zbieżność USA & GPW */}
      <ConvergenceSummaryCards onNavigateTab={onNavigateTab} />

      {/* Kalendarz Ujawnień */}
      <DisclosureCalendarWidget year={YEAR} latestDateLabel={LATEST_DATE_LABEL} />
    </div>
  );
};
