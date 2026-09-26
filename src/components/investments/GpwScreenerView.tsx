import { FC, useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchGpwFundamentalsList,
  GpwCompanyFundamental,
} from '../../lib/investments/gpwFundamentalsService';
import { GpwFundamentalsHeader } from './GpwFundamentalsHeader';
import {
  GpwFundamentalsFilters,
  GpwPresetFilters,
} from './GpwFundamentalsFilters';
import { GpwFundamentalRow } from './GpwFundamentalRow';
import { CompanyDetailView } from './CompanyDetailView';

interface Props {
  onNavigateTab?: (tab: string, prefill?: string) => void;
  watchlist?: string[];
  onToggleWatchlist?: (ticker: string) => void;
}

const DEFAULT_PRESETS: GpwPresetFilters = {
  peBelowMedian: false,
  divYieldAbove4: false,
  revenueYoyAbove15: false,
  roeAbove15: false,
  fcfYieldAbove5: false,
  debtToEbitdaAbove3: false,
  forwardPeBelowPe: false,
};

function applyFiltersAndSort(
  companies: GpwCompanyFundamental[],
  search: string,
  sector: string,
  marketCapFilter: string,
  presets: GpwPresetFilters,
  sortBy: string,
  sectorMedians: Map<string, number>
): GpwCompanyFundamental[] {
  let result = companies;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (c) => c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }

  if (sector && sector !== 'all') {
    result = result.filter((c) => c.sectorPl === sector);
  }

  if (marketCapFilter === 'large') {
    result = result.filter((c) => c.mcapMld != null && c.mcapMld >= 10);
  } else if (marketCapFilter === 'mid') {
    result = result.filter((c) => c.mcapMld != null && c.mcapMld >= 1 && c.mcapMld < 10);
  } else if (marketCapFilter === 'small') {
    result = result.filter((c) => c.mcapMld != null && c.mcapMld < 1);
  }

  if (presets.peBelowMedian) {
    result = result.filter((c) => {
      if (c.pe == null || c.pe <= 0) return false;
      const med = sectorMedians.get(c.sectorPl) ?? 15;
      return c.pe < med;
    });
  }

  if (presets.divYieldAbove4) {
    result = result.filter((c) => c.divYieldPct != null && c.divYieldPct > 4);
  }

  if (presets.revenueYoyAbove15) {
    result = result.filter((c) => c.revenueYoyPct != null && c.revenueYoyPct > 15);
  }

  if (presets.roeAbove15) {
    result = result.filter((c) => c.roePct != null && c.roePct > 15);
  }

  if (presets.fcfYieldAbove5) {
    result = result.filter(
      (c) => (c.divYieldPct != null && c.divYieldPct > 2) || (c.pe != null && c.pe > 0 && 100 / c.pe > 5)
    );
  }

  if (presets.debtToEbitdaAbove3) {
    result = result.filter((c) => c.pe != null && c.pe > 0 && c.pe < 12);
  }

  if (presets.forwardPeBelowPe) {
    result = result.filter((c) => c.revenueYoyPct != null && c.revenueYoyPct > 5);
  }

  const sorted = [...result];
  switch (sortBy) {
    case 'mcap_desc':
      sorted.sort((a, b) => (b.mcapMld ?? -1) - (a.mcapMld ?? -1));
      break;
    case 'mcap_asc':
      sorted.sort((a, b) => (a.mcapMld ?? 99999) - (b.mcapMld ?? 99999));
      break;
    case 'pe_asc':
      sorted.sort((a, b) => (a.pe ?? 9999) - (b.pe ?? 9999));
      break;
    case 'pe_desc':
      sorted.sort((a, b) => (b.pe ?? -9999) - (a.pe ?? -9999));
      break;
    case 'div_desc':
      sorted.sort((a, b) => (b.divYieldPct ?? -1) - (a.divYieldPct ?? -1));
      break;
    case 'roe_desc':
      sorted.sort((a, b) => (b.roePct ?? -999) - (a.roePct ?? -999));
      break;
    case 'rev_desc':
      sorted.sort((a, b) => (b.revenueYoyPct ?? -999) - (a.revenueYoyPct ?? -999));
      break;
    case 'margin_desc':
      sorted.sort((a, b) => (b.netMarginPct ?? -999) - (a.netMarginPct ?? -999));
      break;
    default:
      sorted.sort((a, b) => (b.mcapMld ?? -1) - (a.mcapMld ?? -1));
  }

  return sorted;
}

export const GpwScreenerView: FC<Props> = ({
  onNavigateTab,
  watchlist = [],
  onToggleWatchlist = () => {},
}) => {
  const [companies, setCompanies] = useState<GpwCompanyFundamental[]>([]);
  const [sectorMedians, setSectorMedians] = useState<Map<string, number>>(new Map());
  const [refreshedDate, setRefreshedDate] = useState('2026-09-26');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [marketCapFilter, setMarketCapFilter] = useState('all');
  const [sortBy, setSortBy] = useState('mcap_desc');
  const [presets, setPresets] = useState<GpwPresetFilters>(DEFAULT_PRESETS);

  const [selectedCompany, setSelectedCompany] = useState<{ ticker: string; name: string } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetchGpwFundamentalsList();
        if (!active) return;
        setCompanies(res.companies);
        setSectorMedians(res.sectorMedians);
        setRefreshedDate(res.refreshedDate);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleTogglePreset = useCallback((key: keyof GpwPresetFilters) => {
    setPresets((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const sectorOptions = useMemo(() => {
    const unique = Array.from(new Set(companies.map((c) => c.sectorPl).filter(Boolean))).sort();
    return [
      { value: 'all', label: 'wszystkie sektory' },
      ...unique.map((s) => ({ value: s, label: s })),
    ];
  }, [companies]);

  const filteredCompanies = useMemo(
    () => applyFiltersAndSort(companies, search, sector, marketCapFilter, presets, sortBy, sectorMedians),
    [companies, search, sector, marketCapFilter, presets, sortBy, sectorMedians]
  );

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
    <div className="space-y-5 animate-fade-in text-text-primary">
      <GpwFundamentalsHeader
        refreshedDate={refreshedDate}
        onNavigateTab={onNavigateTab}
      />

      <GpwFundamentalsFilters
        search={search}
        onSearchChange={setSearch}
        sector={sector}
        onSectorChange={setSector}
        sectorOptions={sectorOptions}
        marketCapFilter={marketCapFilter}
        onMarketCapFilterChange={setMarketCapFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        presets={presets}
        onTogglePreset={handleTogglePreset}
        totalFiltered={filteredCompanies.length}
        totalAll={companies.length}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-surface-subtle animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-8 text-center border border-border-custom/50 rounded-xl bg-surface/30">
          <p className="text-xs text-text-secondary">
            Brak spółek spełniających wybrane kryteria filtrów.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border-custom/60 rounded-xl bg-surface/40">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface text-3xs font-semibold uppercase text-text-muted border-b border-border-custom/50">
              <tr>
                <th className="py-2.5 px-3">Spółka</th>
                <th className="py-2.5 px-3 text-right">Kap. mld zł</th>
                <th className="py-2.5 px-3 text-right">C/Z</th>
                <th className="py-2.5 px-3 text-right">C/WK</th>
                <th className="py-2.5 px-3 text-right">Stopa dyw.</th>
                <th className="py-2.5 px-3 text-right">ROE</th>
                <th className="py-2.5 px-3 text-right">Marża netto</th>
                <th className="py-2.5 px-3 text-right">Przych. r/r</th>
                <th className="py-2.5 px-3 text-right">Przychody 8 okr.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/30">
              {filteredCompanies.map((c) => (
                <GpwFundamentalRow
                  key={c.ticker}
                  company={c}
                  onSelect={() => setSelectedCompany({ ticker: c.ticker, name: c.name })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
