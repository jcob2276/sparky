import { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { ChevronLeft, Star, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { PoliticianAvatar } from './PoliticianAvatar';
import { PoliticianPortfolioTable } from './PoliticianPortfolioTable';
import { PoliticianHistoryTable } from './PoliticianHistoryTable';
import {
  fetchPoliticianDetail,
  PoliticianDetail,
} from '../../lib/investments/congressService';

interface Props {
  politicianNameOrId: string;
  onBack: () => void;
  onSelectStock?: (ticker: string) => void;
  watchlist: string[];
  onToggleWatchlist: (name: string) => void;
}

const formatUsd = (val: number) => {
  if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace('.', ',')} mln USD`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1).replace('.', ',')} tys USD`;
  return `${val.toLocaleString()} USD`;
};

const PoliticianKpiCards: FC<{ detail: PoliticianDetail }> = ({ detail }) => {
  const isDem = detail.party === 'D';
  const kpis = [
    {
      label: 'PARTIA',
      val: detail.partyLabel,
      color: isDem ? 'text-primary' : 'text-danger',
    },
    {
      label: 'WSZYSTKIE UJAWNIENIA',
      val: `${detail.totalDisclosures}`,
      color: 'text-text-primary',
    },
    {
      label: 'KUPNA / SPRZEDAŻ',
      val: `${detail.buysCount} / ${detail.sellsCount}`,
      color: 'text-text-primary',
    },
    {
      label: 'WOLUMEN ~',
      val: formatUsd(detail.totalVolumeUsd),
      color: 'text-text-primary',
    },
    {
      label: 'WIDEŁKI ŁĄCZNIE',
      val: `${formatUsd(detail.rangeLowUsd)} - ${formatUsd(detail.rangeHighUsd)}`,
      color: 'text-text-primary',
    },
    {
      label: 'OSTATNIA TRANSAKCJA',
      val: detail.lastTradeDate || '—',
      color: 'text-text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between"
        >
          <div className="text-3xs font-black uppercase tracking-wider text-text-muted">
            {kpi.label}
          </div>
          <div className={`mt-2 font-mono font-black text-lg tabular-nums truncate ${kpi.color}`}>
            {kpi.val}
          </div>
        </div>
      ))}
    </div>
  );
};

const PoliticianPerformanceCard: FC<{ detail: PoliticianDetail }> = ({ detail }) => {
  const perf = detail.performance;
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-success" />
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
          Historyczny zwrot po ujawnieniu z porównaniem do S&amp;P 500
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-subtle border border-border-custom/50 rounded-xl p-3.5 space-y-1">
          <div className="text-3xs font-mono uppercase text-text-muted">Zwrot polityka (1Y)</div>
          <div className="text-xl font-black font-mono text-success">
            +{perf.politician1y.toFixed(1).replace('.', ',')}%
          </div>
        </div>
        <div className="bg-surface-subtle border border-border-custom/50 rounded-xl p-3.5 space-y-1">
          <div className="text-3xs font-mono uppercase text-text-muted">Benchmark S&amp;P 500 (1Y)</div>
          <div className="text-xl font-black font-mono text-text-primary">
            +{perf.sp5001y.toFixed(1).replace('.', ',')}%
          </div>
        </div>
        <div className="bg-surface-subtle border border-border-custom/50 rounded-xl p-3.5 space-y-1">
          <div className="text-3xs font-mono uppercase text-text-muted">Alfa (Przewaga nad rynkiem)</div>
          <div className="text-xl font-black font-mono text-primary">
            +{perf.alpha1y.toFixed(1).replace('.', ',')}%
          </div>
        </div>
      </div>
    </div>
  );
};



export const PoliticianDetailView: FC<Props> = ({
  politicianNameOrId,
  onBack,
  onSelectStock,
  watchlist,
  onToggleWatchlist,
}) => {
  const [detail, setDetail] = useState<PoliticianDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetchPoliticianDetail(politicianNameOrId);
        if (active) {
          setDetail(res);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Błąd pobierania profilu polityka');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [politicianNameOrId, retryCount]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-24 bg-surface-subtle animate-pulse rounded-md" />
        <div className="h-16 w-full bg-surface-subtle animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-subtle animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-44 w-full bg-surface-subtle animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
        <AlertCircle size={32} className="mx-auto text-danger" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-text-primary">Błąd profilu polityka</h3>
          <p className="text-2xs text-text-muted">{error || 'Nie znaleziono danych'}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" onClick={onBack}>Powrót</Button>
          <Button size="sm" variant="primary" icon={<RefreshCw size={13} />} onClick={() => { setLoading(true); setRetryCount((c) => c + 1); }}>
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  const isWatched = watchlist.includes(detail.name);

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Back button */}
      <div>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronLeft size={14} />}
          onClick={onBack}
          className="text-primary text-xs font-bold hover:underline px-0 h-auto"
        >
          KONGRES
        </Button>
      </div>

      {/* Politician Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PoliticianAvatar
            name={detail.name}
            bioguideId={detail.bioguideId}
            party={detail.party}
            size={56}
          />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-text-primary">
              {detail.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider ${
                detail.party === 'D' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-danger/10 text-danger border border-danger/20'
              }`}>
                {detail.partyLabel}
              </span>
              <span className="text-2xs font-mono text-text-muted">
                {detail.chamberLabel} · {detail.state} · UJAWNIENIA STOCK ACT
              </span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant={isWatched ? 'secondary' : 'tonal'}
          icon={<Star size={13} className={isWatched ? 'fill-warning text-warning' : ''} />}
          onClick={() => onToggleWatchlist(detail.name)}
          className="rounded-xl text-xs font-semibold uppercase tracking-wider"
        >
          {isWatched ? 'Obserwujesz' : 'Obserwuj'}
        </Button>
      </div>

      {/* 6 KPI Cards */}
      <PoliticianKpiCards detail={detail} />

      {/* S&P 500 Alpha Comparison */}
      <PoliticianPerformanceCard detail={detail} />

      {/* Portfolio Breakdown */}
      <PoliticianPortfolioTable portfolio={detail.portfolio} onSelectStock={onSelectStock} />

      {/* Full Transactions History */}
      <PoliticianHistoryTable transactions={detail.transactions} onSelectStock={onSelectStock} />

      {/* Educational Footer Disclaimer */}
      <div className="text-3xs text-text-muted space-y-1 pt-2 border-t border-border-custom/30 leading-relaxed font-mono">
        <p className="font-bold uppercase tracking-wider">
          Portfel hipotetyczny: kupna z ujawnień, waga = środek przedziału kwoty. Fakt o danych, nie zalecenie.
        </p>
        <p>
          Serwis ma charakter wyłącznie informacyjno-edukacyjny. Prezentowane dane pochodzą z publicznych źródeł
          (formularze STOCK Act Kongresu USA). Wyniki historyczne nie stanowią gwarancji przyszłych wyników.
        </p>
      </div>
    </div>
  );
};
