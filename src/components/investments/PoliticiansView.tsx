import { FC, useState } from 'react';
import Button from '../ui/Button';
import { useCongressOverview } from '../../lib/investments/useCongressOverview';
import {
  CongressFilterToolbar,
  ChamberFilter,
  PartyFilter,
  TimeframeFilter,
} from './CongressFilterToolbar';
import { CongressSummaryCards } from './CongressSummaryCards';
import { CongressClusterRadar } from './CongressClusterRadar';
import { CongressStreamTable } from './CongressStreamTable';
import { CongressRankingCard } from './CongressRankingCard';
import { PoliticianDetailView } from './PoliticianDetailView';
import { CompanyDetailView } from './CompanyDetailView';
import { HouseDisclosureDocuments } from './HouseDisclosureDocuments';

interface Props {
  watchlist?: string[];
  onToggleWatchlist?: (item: string) => void;
  onNavigateTab?: (tab: string, prefill?: string) => void;
}

export const PoliticiansView: FC<Props> = ({
  watchlist = [],
  onToggleWatchlist = () => {},
  onNavigateTab,
}) => {
  const [chamber, setChamber] = useState<ChamberFilter>('all');
  const [party, setParty] = useState<PartyFilter>('all');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [searchPolitician, setSearchPolitician] = useState('');
  const [searchTicker, setSearchTicker] = useState('');

  const [selectedPolitician, setSelectedPolitician] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { overview, loading, error, refresh, sourceStatus, documents } = useCongressOverview({
    chamber, party, timeframe, searchQuery: searchPolitician, tickerQuery: searchTicker,
  });

  // Politician detail view drilldown
  if (selectedPolitician) {
    return (
      <PoliticianDetailView
        politicianNameOrId={selectedPolitician}
        onBack={() => setSelectedPolitician(null)}
        onSelectStock={(t) => setSelectedStock(t)}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
      />
    );
  }

  // Stock detail view drilldown
  if (selectedStock) {
    return (
      <CompanyDetailView
        ticker={selectedStock}
        onBack={() => setSelectedStock(null)}
        onNavigateTab={onNavigateTab}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-custom/50">
        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-text-primary">
            Kongres · Transakcje
          </h2>
          <p className="text-2xs text-text-muted mt-0.5">
            Fakt o danych, kto co ujawnił i kiedy, nie zalecenie.
          </p>
        </div>
        <div className="text-3xs font-mono text-text-muted uppercase tracking-wider">
          STOCK ACT · IZBA · SENAT
        </div>
      </div>

      {/* Filter Toolbar */}
      <CongressFilterToolbar
        chamber={chamber}
        onChamberChange={setChamber}
        party={party}
        onPartyChange={setParty}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        searchPolitician={searchPolitician}
        onSearchPoliticianChange={setSearchPolitician}
        searchTicker={searchTicker}
        onSearchTickerChange={setSearchTicker}
      />

      <p className="text-xs text-text-muted">
        House PTR · {sourceStatus ? `ostatnia kontrola: ${new Date(sourceStatus.checked_at).toLocaleString('pl-PL')}` : 'brak potwierdzonej kontroli źródła'}
        {sourceStatus?.latest_disclosure_date && ` · najnowsza data zgłoszenia: ${sourceStatus.latest_disclosure_date}`}
        {sourceStatus?.status !== 'ok' && sourceStatus && ' · import wymaga sprawdzenia'}
      </p>
      {overview?.coverage.limited && <p className="text-xs text-warning">Załadowano {overview.coverage.fetchedRows} ostatnich rekordów. Zawęź okres, aby podsumowania obejmowały cały wybrany zakres.</p>}
      {chamber !== 'senate'
        && <HouseDisclosureDocuments documents={documents} />}
      {error ? <div role="alert" className="p-6 text-sm text-danger">
        Nie udało się odczytać zgłoszeń. <Button variant="ghost" className="underline" onClick={() => { void refresh(); }}>Spróbuj ponownie</Button>
      </div> : loading || !overview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface-subtle animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 h-96 bg-surface-subtle animate-pulse rounded-2xl" />
            <div className="h-96 bg-surface-subtle animate-pulse rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Top 4 Summary Cards */}
          <CongressSummaryCards
            data={overview}
            onSelectStock={(t) => setSelectedStock(t)}
            onSelectPolitician={(p) => setSelectedPolitician(p)}
          />

          {/* Cluster Buy Radar */}
          <CongressClusterRadar
            clusterBuys={overview.clusterBuys}
            onSelectStock={(t) => setSelectedStock(t)}
            onSelectPolitician={(p) => setSelectedPolitician(p)}
          />

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 gap-5 items-start">
            {/* Left: Stream Table (2 cols) */}
            <div className="min-w-0">
              <CongressStreamTable
                stream={overview.stream}
                onSelectPolitician={(p) => setSelectedPolitician(p)}
                onSelectStock={(t) => setSelectedStock(t)}
              />
            </div>

            {/* Right: Ranking Card (1 col) */}
            <div className="min-w-0">
              <CongressRankingCard
                rankings={overview.rankings}
                onSelectPolitician={(p) => setSelectedPolitician(p)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
