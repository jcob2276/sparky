import { FC, useState, useMemo, useCallback } from 'react';
import { useGpwFundamentals } from '../../hooks/useGpwFundamentals';
import { DEFAULT_GPW_PRESETS, filterGpwFundamentals, type GpwPresetFilters } from '../../lib/investments/gpwFundamentalsFilters';
import EmptyState from '../ui/EmptyState';
import { GpwFundamentalsHeader } from './GpwFundamentalsHeader';
import {
  GpwFundamentalsFilters,
} from './GpwFundamentalsFilters';
import { GpwFundamentalRow } from './GpwFundamentalRow';
import { CompanyDetailView } from './CompanyDetailView';

interface Props {
  onNavigateTab?: (tab: string, prefill?: string) => void;
  watchlist?: string[];
  onToggleWatchlist?: (ticker: string) => void;
}

export const GpwScreenerView: FC<Props> = ({
  onNavigateTab,
  watchlist = [],
  onToggleWatchlist = () => {},
}) => {
  const { companies, sectorMedians, refreshedDate, loading, error, retry } = useGpwFundamentals();

  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [marketCapFilter, setMarketCapFilter] = useState('all');
  const [sortBy, setSortBy] = useState('mcap_desc');
  const [presets, setPresets] = useState<GpwPresetFilters>(DEFAULT_GPW_PRESETS);

  const [selectedCompany, setSelectedCompany] = useState<{ ticker: string; name: string } | null>(null);

  const resetFilters = useCallback(() => {
    setSearch(''); setSector('all'); setMarketCapFilter('all');
    setPresets(DEFAULT_GPW_PRESETS);
  }, []);

  const availablePresets = useMemo(() => {
    const available = new Set<keyof GpwPresetFilters>();
    for (const c of companies) {
      if (c.pe != null && sectorMedians.has(c.sectorPl)) available.add('peBelowMedian');
      if (c.divYieldPct != null) available.add('divYieldAbove4');
      if (c.revenueYoyPct != null) available.add('revenueYoyAbove15');
      if (c.roePct != null) available.add('roeAbove15');
      if (c.fcfYieldPct != null) available.add('fcfYieldAbove5');
      if (c.debtToEbitda != null) available.add('debtToEbitdaAbove3');
      if (c.forwardPe != null && c.pe != null) available.add('forwardPeBelowPe');
    }
    return available;
  }, [companies, sectorMedians]);

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
    () => filterGpwFundamentals(companies, search, sector, marketCapFilter, presets, sortBy, sectorMedians),
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
        companyCount={companies.length}
        forecastCount={companies.filter((c) => c.forwardPe != null).length}
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
        onReset={resetFilters}
        availablePresets={availablePresets}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-surface-subtle animate-pulse rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div role="alert">
          <EmptyState icon="⚠️" label="Nie udało się pobrać fundamentów GPW. Spróbuj ponownie."
            action={{ label: 'Spróbuj ponownie', onClick: retry }} />
        </div>
      ) : companies.length === 0 ? (
        <EmptyState icon="📊" label="Brak danych fundamentalnych GPW. Źródło nie udostępniło jeszcze danych."
          action={{ label: 'Spróbuj ponownie', onClick: retry }} />
      ) : filteredCompanies.length === 0 ? (
        <EmptyState icon="🔎" label="Brak spółek spełniających wybrane kryteria filtrów."
          action={{ label: 'Wyczyść filtry', onClick: resetFilters }} />
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
                <th className="py-2.5 px-3 text-right">FCF yield</th>
                <th className="py-2.5 px-3 text-right">Dług netto/EBITDA</th>
                <th className="py-2.5 px-3 text-right" title="Kurs / konsensus prognozy EPS na najbliższy niezakończony rok obrotowy. Prognoza EPS może uwzględniać korekty analityków.">Forward C/Z</th>
                <th className="py-2.5 px-3 text-right">Przychody 8 kw.</th>
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
