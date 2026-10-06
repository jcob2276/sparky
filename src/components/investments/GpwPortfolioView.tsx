import { FC, useState, useMemo } from 'react';
import { type GpwStockItem } from '../../lib/investments/gpwCompaniesService';
import { useGpwCompanies } from '../../hooks/useGpwCompanies';
import EmptyState from '../ui/EmptyState';
import { GpwCompaniesHeader } from './GpwCompaniesHeader';
import { GpwCompanyRow } from './GpwCompanyRow';
import { CompanyDetailView } from './CompanyDetailView';

interface Props {
  watchlist?: string[];
  onToggleWatchlist?: (ticker: string) => void;
  onNavigateTab?: (tab: string, prefill?: string) => void;
}

function applyGpwFilters(
  stocks: GpwStockItem[],
  search: string,
  filterSignal: boolean,
  filterInsiderSort: boolean,
  filterOnlyBuys: boolean
): GpwStockItem[] {
  let list = stocks;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }

  if (filterSignal) {
    list = list.filter((s) => s.signal != null);
  }

  if (filterOnlyBuys) {
    list = list.filter((s) => s.buys90dCount != null && s.buys90dCount > 0);
  }

  const sorted = [...list];
  if (filterInsiderSort) {
    sorted.sort((a, b) => (b.buys90dCount ?? 0) - (a.buys90dCount ?? 0));
  } else {
    sorted.sort((a, b) => (b.shortPct ?? -1) - (a.shortPct ?? -1));
  }

  return sorted;
}

export const GpwPortfolioView: FC<Props> = ({
  watchlist = [],
  onToggleWatchlist = () => {},
  onNavigateTab,
}) => {
  const { stocks, summary, loading, error, retry } = useGpwCompanies();

  const [search, setSearch] = useState('');
  const [filterSignal, setFilterSignal] = useState(false);
  const [filterInsiderSort, setFilterInsiderSort] = useState(false);
  const [filterOnlyBuys, setFilterOnlyBuys] = useState(false);

  const [selectedStock, setSelectedStock] = useState<{ ticker: string; name: string } | null>(null);

  const filteredStocks = useMemo(
    () => applyGpwFilters(stocks, search, filterSignal, filterInsiderSort, filterOnlyBuys),
    [stocks, search, filterSignal, filterInsiderSort, filterOnlyBuys]
  );

  if (selectedStock) {
    return (
      <CompanyDetailView
        market="gpw"
        ticker={selectedStock.ticker}
        initialName={selectedStock.name}
        onBack={() => setSelectedStock(null)}
        onNavigateTab={onNavigateTab}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-in text-text-primary">
      <GpwCompaniesHeader
        search={search}
        onSearchChange={setSearch}
        filterSignal={filterSignal}
        onToggleSignal={() => setFilterSignal((p) => !p)}
        filterInsiderSort={filterInsiderSort}
        onToggleInsiderSort={() => setFilterInsiderSort((p) => !p)}
        filterOnlyBuys={filterOnlyBuys}
        onToggleOnlyBuys={() => setFilterOnlyBuys((p) => !p)}
        summary={summary}
        totalFiltered={filteredStocks.length}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-surface-subtle animate-pulse rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div role="alert"><EmptyState icon="⚠️" label="Nie udało się odczytać danych GPW."
          action={{ label: 'Spróbuj ponownie', onClick: retry }} /></div>
      ) : filteredStocks.length === 0 ? (
        <div className="p-8 text-center border border-border-custom/50 rounded-xl bg-surface/30">
          <p className="text-xs text-text-secondary">
            Brak spółek GPW spełniających wybrane kryteria wyszukiwania.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-custom/60 rounded-xl bg-surface/40">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface text-3xs font-semibold uppercase text-text-muted border-b border-border-custom/50">
              <tr>
                <th className="py-2.5 px-3">Spółka</th>
                <th className="py-2.5 px-3 text-right">Kurs PLN</th>
                <th className="py-2.5 px-3 text-right">Dziś</th>
                <th className="py-2.5 px-3 text-right">Short</th>
                <th className="py-2.5 px-3 text-right">Zm. 14D</th>
                <th className="py-2.5 px-3 text-right">Zakupy 90D</th>
                <th className="py-2.5 px-3 text-left">Sygnał</th>
                <th className="py-2.5 px-3 text-right" title="Dostępne rzeczywiste notowania z ostatnich 12 miesięcy; historia może być krótsza.">Historia do 12M</th>
                <th className="py-2.5 px-2 text-center w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/30">
              {filteredStocks.map((stock) => (
                <GpwCompanyRow
                  key={stock.ticker}
                  stock={stock}
                  isWatched={watchlist.includes(stock.ticker)}
                  onToggleWatchlist={onToggleWatchlist}
                  onSelect={() => setSelectedStock({ ticker: stock.ticker, name: stock.name })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
