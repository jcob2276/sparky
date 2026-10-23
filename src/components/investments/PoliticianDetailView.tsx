import { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { ChevronLeft, Star, AlertCircle, RefreshCw } from 'lucide-react';
import { PoliticianKpiCards, PoliticianDisclosureCard } from './PoliticianKpiCards';
import { formatDatePl } from '../../lib/investments/congressTradeFormat';
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
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {detail.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                detail.party === 'D' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-danger/10 text-danger border border-danger/20'
              }`}>
                {detail.partyLabel}
              </span>
              <span className="text-2xs font-mono text-text-muted">
                {detail.chamberLabel}{detail.state && ` · ${detail.state}`} · UJAWNIENIA STOCK ACT OD {formatDatePl(detail.since)}
              </span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant={isWatched ? 'secondary' : 'tonal'}
          icon={<Star size={13} className={isWatched ? 'fill-warning text-warning' : ''} />}
          onClick={() => onToggleWatchlist(detail.name)}
          className="rounded-xl text-xs font-semibold"
        >
          {isWatched ? 'Obserwujesz' : 'Obserwuj'}
        </Button>
      </div>

      {/* 6 KPI Cards */}
      <PoliticianKpiCards detail={detail} />

      {/* Terminowość ujawnień */}
      <PoliticianDisclosureCard detail={detail} />
      {detail.totalDisclosures === 0 && (
        <p className="text-xs text-text-muted">Brak ujawnień tego polityka od {formatDatePl(detail.since)}. Dane obejmują wyłącznie bieżący rok.</p>
      )}

      {/* Portfolio Breakdown */}
      <PoliticianPortfolioTable portfolio={detail.portfolio} onSelectStock={onSelectStock} />

      {/* Full Transactions History */}
      <PoliticianHistoryTable transactions={detail.transactions} onSelectStock={onSelectStock} />

      {/* Educational Footer Disclaimer */}
      <div className="text-2xs text-text-muted space-y-1 pt-2 border-t border-border-custom/30 leading-relaxed font-mono">
        <p className="font-bold">
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
