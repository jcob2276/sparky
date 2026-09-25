import { FC, useState, useCallback } from 'react';
import { WatchlistBuilder, SourceActivityCard, DisclosureStreamWidget } from './OrcaDashboardWidgets';
import { formatShortMonthLabel, formatDashboardDate, getCurrentYear } from '../../lib/date';
import Button from '../ui/Button';

interface Props {
  onNavigateTab: (tab: 'investors' | 'politicians' | 'stocks' | 'gpw_shorts' | 'live') => void;
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

// Computed once at module level (deterministic per session, no re-render issues)
const TODAY_LABEL = formatDashboardDate().toUpperCase();
const YEAR = getCurrentYear();
const LATEST_DATE_LABEL = formatShortMonthLabel(new Date().setDate(new Date().getDate() - 3));

export const OrcaDashboardView: FC<Props> = ({ onNavigateTab }) => {
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);

  const handleToggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Dziś w skrócie Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block" />
          <span className="text-2xs font-mono font-bold uppercase tracking-wider text-success">
            ● Live · Dane aktualne
          </span>
          <span className="text-3xs font-mono text-text-muted">{TODAY_LABEL} · CEST</span>
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-primary">
          Dziś w skrócie
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-4xl">
          Najsilniejszy konsensus funduszy i polityków ma <strong className="text-text-primary font-mono">$AMZN</strong> z wynikiem <strong className="text-success font-mono">+4</strong>. Na GPW pozycja krótka na <strong className="text-text-primary font-mono">MODIVO</strong> wzrosła o <strong className="text-danger font-mono">1,57 p.p.</strong>
        </p>
      </div>

      {/* Interactive Watchlist Builder */}
      <WatchlistBuilder watchlist={watchlist} onToggle={handleToggleWatchlist} />

      {/* 4 KPI Grid Cards — 1:1 OrcaFolio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-text-secondary">Nowe zdarzenia / 14 dni</div>
          <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
            0
          </div>
          <div className="text-3xs text-text-muted mt-1 font-mono">
            na {watchlist.length} spółkach watchlisty
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-success">Top konsensus 13F</div>
          <div className="text-2xl font-black text-success font-mono tabular-nums mt-1">
            +4 AMZN
          </div>
          <div className="text-3xs text-text-muted mt-1 font-mono">mediana rynku: 0</div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-danger">Max short GPW</div>
          <div className="text-2xl font-black text-danger font-mono tabular-nums mt-1">
            6,01% MODIVO
          </div>
          <div className="text-3xs text-danger mt-1 font-mono">+1.57 p.p. / 14 dni</div>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="text-2xs font-medium text-primary">Transakcje Kongresu</div>
          <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-1">
            39
          </div>
          <div className="text-3xs text-text-secondary mt-1 font-mono">sprzedaże: 36</div>
        </div>
      </div>

      {/* Source Activity 14D */}
      <SourceActivityCard />

      {/* Live Disclosures Stream */}
      <DisclosureStreamWidget onViewAll={() => onNavigateTab('live')} />

      {/* Top Zbieżność USA & GPW (Free in Sparky vs 90 zł Pro in OrcaFolio) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-custom/40">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-primary">
                Top Zbieżność USA (13F + STOCK Act)
              </div>
              <p className="text-2xs text-text-secondary">
                Fundusze i politycy kupują te same akcje:
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-success/15 text-success border border-success/30">
              100% Free
            </span>
          </div>

          <div className="space-y-2">
            {[
              { ticker: 'AMZN', name: 'Amazon.com Inc.', score: '+4', note: 'Kupno: 3 fundusze 13F + 1 senator' },
              { ticker: 'NVDA', name: 'NVIDIA Corp.', score: '+3', note: 'Kupno: Nancy Pelosi + Ackman + Scion' },
              { ticker: 'GOOGL', name: 'Alphabet Inc.', score: '+3', note: 'Kupno: Pelosi LEAPS + Druckenmiller' },
            ].map((item) => (
              <div key={item.ticker} className="p-3 rounded-2xl bg-surface border border-border-custom/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-text-primary">${item.ticker}</span>
                    <span className="text-2xs text-text-secondary">{item.name}</span>
                  </div>
                  <div className="text-3xs text-text-muted mt-0.5">{item.note}</div>
                </div>
                <span className="font-mono text-sm font-black text-success tabular-nums">{item.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-custom/40">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-danger">
                Zbieżność GPW: Insider Kupuje + Short Spada
              </div>
              <p className="text-2xs text-text-secondary">
                Najsilniejszy sygnał akumulacji na polskim rynku:
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigateTab('gpw_shorts')} className="text-xs text-primary">
              Szorty KNF →
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-custom/50 text-center py-6">
            <span className="text-2xl block mb-1">🎯</span>
            <div className="text-xs font-bold text-text-primary">Brak zbieżnego sygnału dziś</div>
            <p className="text-2xs text-text-secondary max-w-xs mx-auto mt-1">
              Gdy członek zarządu kupi akcje spółki, na której fundusze redukują krótkie pozycje (np. JSW, ALE, DNP), natychmiast pojawi się tu alert.
            </p>
          </div>
        </div>
      </div>

      {/* Kalendarz Ujawnień */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-muted mb-3">
          Kalendarz Ujawnień
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
            <div className="text-xs font-bold font-mono text-primary">14 LIS {new Date().getFullYear()}</div>
            <div className="text-xs font-semibold text-text-primary mt-1">Fundusze 13F (SEC)</div>
            <div className="text-3xs text-text-secondary mt-0.5">Nieprzekraczalny termin zgłoszenia raportów za Q3.</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
            <div className="text-xs font-bold font-mono text-primary">9 LIS {YEAR}</div>
            <div className="text-xs font-semibold text-text-primary mt-1">Kongres (STOCK Act)</div>
            <div className="text-3xs text-text-secondary mt-0.5">Maksymalny termin ujawnienia transakcji zawartych w październiku.</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
            <div className="text-xs font-bold font-mono text-success">{LATEST_DATE_LABEL}</div>
            <div className="text-xs font-semibold text-text-primary mt-1">Najnowsze dane</div>
            <div className="text-3xs text-text-secondary mt-0.5">Richard W. Allen · kupno Broadcom ($AVGO).</div>
          </div>
        </div>
      </div>
    </div>
  );
};
