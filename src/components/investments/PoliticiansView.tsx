import { FC, useState, useEffect } from 'react';
import {
  fetchCongressOverview,
  CongressOverview,
} from '../../lib/investments/congressService';
import {
  CongressFilterToolbar,
  ChamberFilter,
  PartyFilter,
  TimeframeFilter,
} from './CongressFilterToolbar';
import { CongressSummaryCards } from './CongressSummaryCards';
import { CongressStreamTable } from './CongressStreamTable';
import { CongressRankingCard } from './CongressRankingCard';
import { PoliticianDetailView } from './PoliticianDetailView';
import { CompanyDetailView } from './CompanyDetailView';

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

  const [overview, setOverview] = useState<CongressOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetchCongressOverview({
          chamber,
          party,
          timeframe,
          searchQuery: searchPolitician,
          tickerQuery: searchTicker,
        });
        if (active) setOverview(res);
      } catch (err: unknown) {
        console.warn('[PoliticiansView] fetchCongressOverview error', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [chamber, party, timeframe, searchPolitician, searchTicker]);

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

      {loading || !overview ? (
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

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* Left: Stream Table (2 cols) */}
            <div className="lg:col-span-2">
              <CongressStreamTable
                stream={overview.stream}
                onSelectPolitician={(p) => setSelectedPolitician(p)}
                onSelectStock={(t) => setSelectedStock(t)}
              />
            </div>

            {/* Right: Ranking Card (1 col) */}
            <div className="lg:col-span-1">
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
