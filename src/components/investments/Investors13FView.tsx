import { FC, useState, useEffect, useMemo } from 'react';
import {
  fetchSuperinvestorsOverview,
  SuperinvestorOverviewItem,
} from '../../lib/investments/superinvestorDetailService';
import { SuperinvestorsHeader, CategoryFilter } from './SuperinvestorsHeader';
import { SuperinvestorCard } from './SuperinvestorCard';
import { SuperinvestorDetailView } from './SuperinvestorDetailView';
import { Loader2 } from 'lucide-react';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export const Investors13FView: FC<Props> = ({ onNavigateTab }) => {
  const [investors, setInvestors] = useState<SuperinvestorOverviewItem[]>([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    curveCount: 0,
    consensusCount: 0,
    categoriesCount: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await fetchSuperinvestorsOverview();
      if (!active) return;
      setInvestors(res.investors);
      setStats(res.stats);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

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

  const selectedInvestor = useMemo(() => {
    if (!selectedId) return undefined;
    return investors.find((inv) => inv.id === selectedId);
  }, [investors, selectedId]);

  const handleSelectTicker = (_ticker: string) => {
    if (onNavigateTab) {
      onNavigateTab('screener');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-xs font-mono text-text-muted">Pobieranie 59 superinwestorów z bazy SEC 13F...</div>
      </div>
    );
  }

  // Widok szczegółowy wybranego inwestora (media_1790435172046.png)
  if (selectedId) {
    return (
      <SuperinvestorDetailView
        investorId={selectedId}
        overviewItem={selectedInvestor}
        onBack={() => setSelectedId(null)}
        onSelectTicker={handleSelectTicker}
      />
    );
  }

  // Główny pulpit z kartami inwestorów (media_1790435161710.png)
  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <SuperinvestorsHeader
        totalActive={stats.totalActive}
        curveCount={stats.curveCount}
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
