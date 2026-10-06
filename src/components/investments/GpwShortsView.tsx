import { FC, useState, useMemo } from 'react';
import { useGpwShortsData } from '../../lib/investments/useGpwShortsData';
import { GpwShortsHeader } from './GpwShortsHeader';
import { GpwShortsControls, ShortsFilterMode } from './GpwShortsControls';
import { GpwShortsTable } from './GpwShortsTable';
import { GpwShortsChartWidget } from './GpwShortsChartWidget';
import { GpwShorts14dWidget } from './GpwShorts14dWidget';
import Button from '../ui/Button';
import { formatLongDateWarsaw } from '../../lib/date';

interface Props { onNavigateTab?: (tab: string) => void }

export const GpwShortsView: FC<Props> = ({ onNavigateTab }) => {
  const [selection, setSelection] = useState('');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<ShortsFilterMode>('all');
  const { overview, source, selected, chart } = useGpwShortsData(selection);
  const companies = overview.data?.companies;
  const filtered = useMemo(() => (companies ?? []).filter(c => {
    const query = search.trim().toLowerCase();
    return (!query || c.ticker.toLowerCase().includes(query) || c.companyName.toLowerCase().includes(query))
      && (filterMode === 'all' || (filterMode === 'historical' ? c.isHistorical : !c.isHistorical));
  }), [companies, search, filterMode]);
  if (overview.isPending) return <div className="p-8 text-text-secondary">Pobieranie rejestru KNF…</div>;
  if (overview.isError || !overview.data) return <div role="alert" className="p-6 space-y-3">
    <p>Nie udało się odczytać rejestru KNF: {overview.error?.message ?? 'brak odpowiedzi'}</p>
    <Button onClick={() => void overview.refetch()}>Ponów odczyt</Button>
  </div>;
  const { kpis, increases, decreases } = overview.data;
  const health = source.data?.[0];
  return <div className="space-y-5 animate-fade-in text-text-primary">
    <GpwShortsHeader kpis={kpis} onNavigateTab={onNavigateTab} />
    <div className="text-xs text-text-secondary space-y-1">
      <p><a href="https://rss.knf.gov.pl/rss_pub/" target="_blank" rel="noreferrer" className="text-primary underline">Oficjalny rejestr KNF</a>
        {' · '}Ostatnie sprawdzenie: {health?.checked_at ? new Date(health.checked_at).toLocaleString('pl-PL') : 'brak danych'}
        {' · '}Najnowsza publikacja: {health?.latest_disclosure_date ? formatLongDateWarsaw(health.latest_disclosure_date) : 'brak danych'}</p>
      {(source.isError || !health || health.status !== 'ok') && <p role="status">Odświeżenie źródła nie jest potwierdzone.
        {health?.error && ` ${health.error}`} Wyświetlany jest ostatni zapisany rejestr.</p>}
      <p>Suma obejmuje ujawnione pozycje od 0,5%. Brak bieżącego wpisu nie oznacza braku krótkiej pozycji.</p>
    </div>
    <GpwShortsControls search={search} onSearchChange={setSearch} filterMode={filterMode}
      onFilterModeChange={setFilterMode} kpis={kpis} />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-8">
        {filtered.length ? <GpwShortsTable companies={filtered} selectedTicker={selected?.ticker ?? ''} onSelectTicker={setSelection} />
          : <p className="p-6 text-text-secondary">Brak spółek dla wybranych filtrów.</p>}
      </div>
      <div className="lg:col-span-4 space-y-4">
        {chart.isPending && selected && <p className="text-xs text-text-secondary">Pobieranie historii…</p>}
        {chart.isError && <div role="alert" className="text-xs space-y-2"><p>Nie udało się odczytać historii: {chart.error.message}</p>
          <Button onClick={() => void chart.refetch()}>Ponów odczyt historii</Button></div>}
        {chart.data && <GpwShortsChartWidget data={chart.data} isTopRanked={selected?.ticker === kpis.highestShortTicker} />}
        <GpwShorts14dWidget increases={increases} decreases={decreases} onSelectTicker={setSelection} />
      </div>
    </div>
  </div>;
};
