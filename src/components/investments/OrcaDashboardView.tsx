import { FC, useState, useCallback } from 'react';
import { loadStoredWatchlist, saveStoredWatchlist } from '../../lib/investments/watchlistStorage';
import { useDashboardData } from '../../lib/investments/useDashboardData';
import { DashboardWatchlistBuilder } from './DashboardWatchlistBuilder';
import { DashboardEqualWeightChart } from './DashboardEqualWeightChart';
import { DashboardKpiStack } from './DashboardKpiStack';
import { DashboardActivityChart } from './DashboardActivityChart';
import { DashboardDisclosureStream } from './DashboardDisclosureStream';
import { DashboardBottomCards } from './DashboardBottomCards';
import { DashboardHeader, DashboardSourceStatus } from './DashboardSourceStatus';
interface Props { onNavigateTab: (tab: string) => void }
export const OrcaDashboardView: FC<Props> = ({ onNavigateTab }) => {
  const [watchlist, setWatchlist] = useState<string[]>(loadStoredWatchlist);
  const [builderDismissed, setBuilderDismissed] = useState(false);
  const query = useDashboardData(watchlist);
  const handleToggleWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => { const next = prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]; saveStoredWatchlist(next); return next; });
  }, []);
  return <div className="space-y-4 animate-fade-in text-text-primary">
    <DashboardHeader />
    {query.isPending && <p role="status">Pobieranie danych źródłowych…</p>}
    {query.error && <p role="alert" className="text-danger">Nie udało się odczytać pulpitu: {query.error.message}</p>}
    {query.data && <DashboardContent data={query.data} watchlist={watchlist} onNavigateTab={onNavigateTab} />}
    {!builderDismissed && watchlist.length < 3 && <DashboardWatchlistBuilder watchlist={watchlist} onToggle={handleToggleWatchlist} onDismiss={() => setBuilderDismissed(true)} />}
    <p className="text-3xs text-text-muted">Dane publiczne mają opóźnienia i niepełne pokrycie. Serwis ma charakter informacyjno-edukacyjny i nie świadczy doradztwa inwestycyjnego.</p>
  </div>;
};
const DashboardContent = ({ data, watchlist, onNavigateTab }: { data: NonNullable<ReturnType<typeof useDashboardData>['data']>; watchlist: string[]; onNavigateTab: Props['onNavigateTab'] }) => <>
  <DashboardSourceStatus data={data} />
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <div className="lg:col-span-8"><DashboardEqualWeightChart watchlist={watchlist} onNavigateToWatchlist={() => onNavigateTab('watchlist')} /></div>
    <div className="lg:col-span-4"><DashboardKpiStack data={data} watchlistLength={watchlist.length} /></div>
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <div className="lg:col-span-5"><DashboardActivityChart activity={data.activity14d} /></div>
    <div className="lg:col-span-7"><DashboardDisclosureStream items={data.streamItems} onViewAll={() => onNavigateTab('live')} /></div>
  </div>
  <DashboardBottomCards topConvergence={data.topConvergenceUsa} topGpwShorts={data.topGpwShorts} onNavigateTab={onNavigateTab} />
</>;
