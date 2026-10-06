import { FC, useState, useMemo } from 'react';
import { getTodayWarsaw } from '../../lib/date';
import { notify } from '../../lib/notify';
import { StocksConsensusCards } from './StocksConsensusCards';
import {
  StocksConsensusToolbar,
  FilterType,
  SortOption,
} from './StocksConsensusToolbar';
import { StocksConsensusTable } from './StocksConsensusTable';
import { CompanyDetailView } from './CompanyDetailView';
import { useStocksConsensus } from '../../lib/investments/useStocksConsensus';

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
  const { consensusList, stats, loading, error } = useStocksConsensus();
  const [selectedCompany, setSelectedCompany] = useState<{ ticker: string; name: string } | null>(null);

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
    const headers = 'Ticker,Spółka,Sektor,Kurs_USD,Zmiana_Dziś_%,Wzrost_Pozycji_Funduszy,Spadek_Pozycji_Funduszy,Wartość_USD,Wynik_Netto,Stan_Na,Poprzedni_Kwartał,Porównane_Fundusze,Data_Kursu,Status_Notowań,Data_Statusu,Źródło_Statusu\n';
    const rows = processedList
      .map(
        (s) =>
          [s.ticker, s.name, s.sector, s.priceUsd ?? '', s.changeToday ?? '',
            s.comparedFunds ? s.fundsBuying : '', s.comparedFunds ? s.fundsSelling : '',
            s.totalValueRaw, s.comparedFunds ? s.netScore : '', s.reportPeriod,
            s.previousPeriod, s.comparedFunds, s.priceDate ?? '',
            s.listingStatus ?? 'unknown', s.listingStatusDate ?? '', s.listingSourceUrl ?? '']
            .map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')
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
      {error && <p role="alert" className="text-danger">{error}</p>}
      <p className="text-xs text-text-secondary">
        Stan raportów: {stats.reportPeriod ?? '—'}; porównanie z {stats.previousPeriod ?? '—'}.
        {' '}Zmiany liczby wykazanych akcji, nie potwierdzone transakcje. Import trwa; pokrycie jest częściowe.
        {' '}Opcje i obligacje pominięte; nierozliczone korekty raportów wyłączone.
      </p>
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

    </div>
  );
};
