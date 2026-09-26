import { FC, useState, useEffect, useMemo } from 'react';
import {
  fetchGpwShortsData,
  fetchShortVsPriceChart,
  GpwShortCompany,
  GpwShortsKpis,
  Gpw14dMover,
  GpwShortChartData,
} from '../../lib/investments/gpwShortsService';
import { GpwShortsHeader } from './GpwShortsHeader';
import { GpwShortsControls, ShortsFilterMode } from './GpwShortsControls';
import { GpwShortsTable } from './GpwShortsTable';
import { GpwShortsChartWidget } from './GpwShortsChartWidget';
import { GpwShorts14dWidget } from './GpwShorts14dWidget';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

const DEFAULT_KPIS: GpwShortsKpis = {
  totalCompanies: 66,
  activePositions: 49,
  highestShortPct: 6.01,
  highestShortTicker: 'MDV',
  lastRegisterChange: '23.09.2026',
  activeCount: 37,
  historicalCount: 29,
};

function applyShortsFilters(
  companies: GpwShortCompany[],
  search: string,
  filterMode: ShortsFilterMode
): GpwShortCompany[] {
  let list = companies;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (c) => c.ticker.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q)
    );
  }

  if (filterMode === 'active') {
    list = list.filter((c) => !c.isHistorical);
  } else if (filterMode === 'historical') {
    list = list.filter((c) => c.isHistorical);
  }

  return list;
}

export const GpwShortsView: FC<Props> = ({ onNavigateTab }) => {
  const [companies, setCompanies] = useState<GpwShortCompany[]>([]);
  const [kpis, setKpis] = useState<GpwShortsKpis>(DEFAULT_KPIS);
  const [increases, setIncreases] = useState<Gpw14dMover[]>([]);
  const [decreases, setDecreases] = useState<Gpw14dMover[]>([]);
  const [selectedTicker, setSelectedTicker] = useState('MDV');
  const [chartData, setChartData] = useState<GpwShortChartData | null>(null);

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<ShortsFilterMode>('all');
  const [loading, setLoading] = useState(true);

  // Initial fetch of all shorts data
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetchGpwShortsData();
        if (!active) return;
        setCompanies(res.companies);
        setKpis(res.kpis);
        setIncreases(res.increases);
        setDecreases(res.decreases);
        if (res.companies[0]?.ticker) {
          setSelectedTicker(res.companies[0].ticker);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Fetch chart data when selectedTicker changes
  useEffect(() => {
    let active = true;
    void (async () => {
      const match = companies.find((c) => c.ticker === selectedTicker);
      const name = match?.companyName || selectedTicker;
      const res = await fetchShortVsPriceChart(selectedTicker, name);
      if (!active) return;
      setChartData(res);
    })();

    return () => {
      active = false;
    };
  }, [selectedTicker, companies]);

  const filteredCompanies = useMemo(
    () => applyShortsFilters(companies, search, filterMode),
    [companies, search, filterMode]
  );

  return (
    <div className="space-y-5 animate-fade-in text-text-primary">
      {/* Header with Title, 3 GPW Subtabs, and 4 KPI Cards */}
      <GpwShortsHeader kpis={kpis} onNavigateTab={onNavigateTab} />

      {/* Controls: Search & Active/Historical counters */}
      <GpwShortsControls
        search={search}
        onSearchChange={setSearch}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        kpis={kpis}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-surface-subtle animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        /* Main Two-Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Main Shorts Table (65%) */}
          <div className="lg:col-span-8 space-y-4">
            <GpwShortsTable
              companies={filteredCompanies}
              selectedTicker={selectedTicker}
              onSelectTicker={setSelectedTicker}
            />
          </div>

          {/* Right Column: Chart & 14D Movers Widgets (35%) */}
          <div className="lg:col-span-4 space-y-4">
            {chartData && (
              <GpwShortsChartWidget
                data={chartData}
                isTopRanked={selectedTicker === kpis.highestShortTicker}
              />
            )}

            <GpwShorts14dWidget
              increases={increases}
              decreases={decreases}
              onSelectTicker={setSelectedTicker}
            />
          </div>
        </div>
      )}
    </div>
  );
};
