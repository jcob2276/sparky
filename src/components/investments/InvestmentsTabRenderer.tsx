import { FC } from 'react';
import { MainTabType } from './InvestmentsPage';
import { OrcaDashboardView } from './OrcaDashboardView';
import { ConvergenceView } from './ConvergenceView';
import { Investors13FView } from './Investors13FView';
import { PoliticiansView } from './PoliticiansView';
import { EspiFeedView } from './EspiFeedView';
import { GpwShortsView } from './GpwShortsView';
import { GpwScreenerView } from './GpwScreenerView';
import { GpwPortfolioView } from './GpwPortfolioView';
import { LiveTradesView } from './LiveTradesView';
import { InvestmentsAnalystView } from './InvestmentsAnalystView';
import { InvestmentsWatchlistView } from './InvestmentsWatchlistView';
import { StocksConsensusView } from './StocksConsensusView';
import { BasketSimulationView } from './BasketSimulationView';
import { InsiderTradeItem, InvestmentFilters } from '../../lib/investments/investmentsApi';

interface Props {
  activeTab: MainTabType;
  onNavigateTab: (tab: MainTabType) => void;
  trades: InsiderTradeItem[];
  loading: boolean;
  filters: InvestmentFilters;
  onFilterChange: (updated: Partial<InvestmentFilters>) => void;
  clusterTickers: Set<string>;
  historyTruncated?: boolean;
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
}

export const InvestmentsTabRenderer: FC<Props> = ({
  activeTab,
  onNavigateTab,
  trades,
  loading,
  filters,
  onFilterChange,
  clusterTickers,
  historyTruncated = false,
  watchlist,
  onToggleWatchlist,
}) => {
  switch (activeTab) {
    case 'dashboard':
      return (
        <OrcaDashboardView onNavigateTab={(tab) => onNavigateTab(tab as MainTabType)} />
      );
    case 'analyst':
      return <InvestmentsAnalystView />;
    case 'watchlist':
      return <InvestmentsWatchlistView watchlist={watchlist} onToggle={onToggleWatchlist} />;
    case 'convergence':
      return <ConvergenceView watchlist={watchlist} onNavigateTab={(tab) => onNavigateTab(tab as MainTabType)} />;
    case 'screener':
      return (
        <StocksConsensusView
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onNavigateTab={(tab) => onNavigateTab(tab as MainTabType)}
        />
      );
    case 'investors':
      return <Investors13FView onNavigateTab={(tab) => onNavigateTab(tab as MainTabType)} />;
    case 'politicians':
      return (
        <PoliticiansView
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onNavigateTab={(tab) => onNavigateTab(tab as MainTabType)}
        />
      );
    case 'simulation':
      return <BasketSimulationView />;
    case 'stocks':
      return <EspiFeedView />;
    case 'gpw_shorts':
      return <GpwShortsView />;
    case 'gpw_mar':
      return <GpwPortfolioView />;
    case 'methodology':
      return <GpwScreenerView />;
    case 'live':
    default:
      return (
        <LiveTradesView
          trades={trades}
          loading={loading}
          filters={filters}
          onFilterChange={onFilterChange}
          clusterTickers={clusterTickers}
          historyTruncated={historyTruncated}
        />
      );
  }
};
