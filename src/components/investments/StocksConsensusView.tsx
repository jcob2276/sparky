import { FC, useState, useEffect, useMemo } from 'react';
import { getTodayWarsaw } from '../../lib/date';
import { notify } from '../../lib/notify';
import { StocksConsensusCards } from './StocksConsensusCards';
import {
  StocksConsensusToolbar,
  FilterType,
  SortOption,
} from './StocksConsensusToolbar';
import { StocksConsensusTable } from './StocksConsensusTable';
import { TradingViewChartModal } from './TradingViewChartModal';
import { CompanyDetailView } from './CompanyDetailView';
import {
  fetchEnrichedConsensus,
  EnrichedStockConsensus,
  ConsensusStats,
} from '../../lib/investments/consensusService';

interface Props {
  watchlist?: string[];
  onToggleWatchlist?: (ticker: string) => void;
  onNavigateTab?: (tab: string, prefill?: string) => void;
}

export const StocksConsensusView: FC<Props> = ({
  watchlist = [],
  onToggleWatchlist = () => {},
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('capitalization');
  const [searchQuery, setSearchQuery] = useState('');
  const [consensusList, setConsensusList] = useState<EnrichedStockConsensus[]>([]);
  const [stats, setStats] = useState<ConsensusStats>({
    totalCompanies: 0,
    totalMoves: 0,
    topBoughtTicker: '—',
    topBoughtNet: 0,
    topSoldTicker: '—',
    topSoldNet: 0,
    mostActiveTicker: '—',
    mostActiveMoves: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartStock, setChartStock] = useState<{ ticker: string; name: string } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<{ ticker: string; name: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { items, stats: computedStats } = await fetchEnrichedConsensus();
        if (!active) return;
        setConsensusList(items);
        setStats(computedStats);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const processedList = useMemo(() => {
    let result = [...consensusList];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    if (filterType === 'accumulation') {
      result = result.filter((s) => s.netScore > 0);
    } else if (filterType === 'distribution') {
      result = result.filter((s) => s.netScore < 0);
    } else if (filterType === 'active') {
      result = result.filter((s) => s.fundsBuying + s.fundsSelling >= 8);
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'net':
          return b.netScore - a.netScore;
        case 'buyers':
          return b.fundsBuying - a.fundsBuying;
        case 'sellers':
          return b.fundsSelling - a.fundsSelling;
        case 'holders':
          return b.totalFunds - a.totalFunds;
        case 'value':
        case 'capitalization':
          return b.totalValueRaw - a.totalValueRaw;
        case 'ticker':
          return a.ticker.localeCompare(b.ticker);
        default:
          return 0;
      }
    });

    return result;
  }, [consensusList, searchQuery, filterType, sortOption]);

  const handleExportCsv = () => {
    const headers = 'Ticker,Spółka,Sektor,Kurs_USD,Zmiana_Dziś_%,Kupuje_Funduszy,Sprzedaje_Funduszy,Wartość_USD,Wynik_Netto\n';
    const rows = processedList
      .map(
        (s) =>
          `"${s.ticker}","${s.name}","${s.sector}","${s.priceUsd ?? ''}","${s.changeToday ?? ''}","${s.fundsBuying}","${s.fundsSelling}","${s.totalValueUsd}","${s.netScore}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `screener_13f_${getTodayWarsaw()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Wyeksportowano ${processedList.length} spółek do CSV!`, 'success');
  };

  if (selectedCompany) {
    return (
      <CompanyDetailView
        ticker={selectedCompany.ticker}
        initialName={selectedCompany.name}
        onBack={() => setSelectedCompany(null)}
        onNavigateTab={onNavigateTab}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in text-text-primary">
      {/* 4 Top Metric Cards */}
      <StocksConsensusCards stats={stats} loading={loading} />

      {/* Filter, Sort & Search Toolbar */}
      <StocksConsensusToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
        sortOption={sortOption}
        onSortChange={setSortOption}
        totalFilteredCount={processedList.length}
        onExportCsv={handleExportCsv}
        mostActiveTicker={stats.mostActiveTicker}
        mostActiveMoves={stats.mostActiveMoves}
      />

      {/* Consensus Table */}
      <StocksConsensusTable
        stocks={processedList}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
        onSelectStockForChart={(ticker, name) => setSelectedCompany({ ticker, name })}
      />

      {/* Interactive TradingView Chart Modal */}
      {chartStock && (
        <TradingViewChartModal
          isOpen={true}
          onClose={() => setChartStock(null)}
          ticker={chartStock.ticker}
          companyName={chartStock.name}
          market="USA"
        />
      )}
    </div>
  );
};
