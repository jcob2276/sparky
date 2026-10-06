import { FC, useState, useMemo } from 'react';
import { useSuperinvestorsOverview } from '../../lib/investments/useSuperinvestors';
import { SuperinvestorsHeader, CategoryFilter } from './SuperinvestorsHeader';
import { SuperinvestorCard } from './SuperinvestorCard';
import { SuperinvestorDetailView } from './SuperinvestorDetailView';
import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import type { SuperinvestorOverviewItem } from '../../lib/investments/superinvestorTypes';
import { CompanyDetailView } from './CompanyDetailView';
const EMPTY_INVESTORS: SuperinvestorOverviewItem[] = [];

interface Props {
  onNavigateTab?: (tab: string) => void;
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
}

export const Investors13FView: FC<Props> = ({ onNavigateTab, watchlist, onToggleWatchlist }) => {
  const query = useSuperinvestorsOverview();
  const investors = query.data?.investors ?? EMPTY_INVESTORS;
  const stats = query.data?.stats ?? { totalActive: 0, verifiedCount: 0, consensusCount: 0, categoriesCount: 0 };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const filteredInvestors = useMemo(() => {
    return investors.filter((inv) => {
      // 1. Kategoria
      if (category !== 'all') {
        if (category === 'quant') {
          const isQuant =
            inv.slug.includes('two-sigma') ||
            inv.slug.includes('renaissance') ||
            inv.slug.includes('aqr');
          if (!isQuant) return false;
        } else if (inv.category !== category) {
          return false;
        }
      }

      // 2. Wyszukiwanie tekstowe
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        inv.name.toLowerCase().includes(term) ||
        inv.fundName.toLowerCase().includes(term) ||
        inv.cik.toLowerCase().includes(term) ||
        inv.category.toLowerCase().includes(term)
      );
    });
  }, [investors, category, search]);


  if (query.isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-xs font-mono text-text-muted">Pobieranie zweryfikowanych raportów SEC 13F...</div>
      </div>
    );
  }
  if (query.error) return <div role="alert" className="p-8 text-text-secondary">
    Nie udało się pobrać raportów SEC. <Button variant="ghost" onClick={() => void query.refetch()}>Ponów</Button>
  </div>;
  if (selectedTicker) return <CompanyDetailView ticker={selectedTicker} watchlist={watchlist}
    onToggleWatchlist={onToggleWatchlist} onNavigateTab={onNavigateTab} onBack={() => setSelectedTicker(null)} />;

  // Widok szczegółowy wybranego inwestora (media_1790435172046.png)
  if (selectedId) {
    return (
      <SuperinvestorDetailView
        investorId={selectedId}
        onBack={() => setSelectedId(null)}
        onSelectTicker={setSelectedTicker}
      />
    );
  }

  // Główny pulpit z kartami inwestorów (media_1790435161710.png)
  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <SuperinvestorsHeader
        totalActive={stats.totalActive}
        verifiedCount={stats.verifiedCount}
        consensusCount={stats.consensusCount}
        categoriesCount={stats.categoriesCount}
        search={search}
        onSearchChange={setSearch}
        activeCategory={category}
        onCategoryChange={setCategory}
        resultsCount={filteredInvestors.length}
      />

      {/* Grid 4 kolumnowy z kartami superinwestorów */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredInvestors.map((inv) => (
          <SuperinvestorCard
            key={inv.id}
            investor={inv}
            onClick={() => setSelectedId(inv.id)}
          />
        ))}
      </div>

      {filteredInvestors.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-surface border border-border-custom text-text-muted font-mono text-xs">
          Brak inwestorów spełniających wybrane kryteria wyszukiwania.
        </div>
      )}
    </div>
  );
};
