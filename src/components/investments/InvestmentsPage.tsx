import { FC, useState } from 'react';
import { useInvestmentsData } from './useInvestmentsData';
import { InvestmentsTopNav } from './InvestmentsTopNav';
import { InvestmentsHeader } from './InvestmentsHeader';
import { CopycatPlaybookModal } from './CopycatPlaybookModal';
import { Investors13FView } from './Investors13FView';
import { PoliticiansView } from './PoliticiansView';
import { StocksHoldingView } from './StocksHoldingView';
import { GpwShortsView } from './GpwShortsView';
import { MethodologyView } from './MethodologyView';
import { GpwPortfolioView } from './GpwPortfolioView';
import { LiveTradesView } from './LiveTradesView';
import Button from '../ui/Button';

export type MainTabType =
  | 'investors'
  | 'politicians'
  | 'stocks'
  | 'gpw_shorts'
  | 'methodology'
  | 'gpw_mar'
  | 'live';

export const InvestmentsPage: FC = () => {
  const [activeTab, setActiveTab] = useState<MainTabType>('investors');
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);

  const {
    trades,
    stats,
    loading,
    syncing,
    filters,
    handleRefresh,
    handleFilterChange,
    clusterTickers,
  } = useInvestmentsData();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connected Top Navigation Bar */}
        <InvestmentsTopNav
          onOpenPlaybook={() => setIsPlaybookOpen(true)}
          onRefresh={handleRefresh}
          syncing={syncing}
        />

        <InvestmentsHeader
          stats={stats}
          syncing={syncing}
          onRefresh={handleRefresh}
          onOpenPlaybook={() => setIsPlaybookOpen(true)}
        />

        {/* Master Navigation Tabs — 1:1 OrcaFolio Architecture */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-border-custom/50">
          <Button
            size="sm"
            variant={activeTab === 'investors' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('investors')}
            className="rounded-xl shrink-0"
          >
            👔 Inwestorzy 13F
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'politicians' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('politicians')}
            className="rounded-xl shrink-0"
          >
            🏛 Politycy (STOCK Act)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'stocks' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('stocks')}
            className="rounded-xl shrink-0"
          >
            🏢 Spółki
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'gpw_shorts' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('gpw_shorts')}
            className="rounded-xl shrink-0"
          >
            📉 Krótka sprzedaż GPW
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'methodology' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('methodology')}
            className="rounded-xl shrink-0"
          >
            📖 Metodologia
          </Button>

          <div className="h-5 w-px bg-border-custom/60 shrink-0 mx-1" />

          <Button
            size="sm"
            variant={activeTab === 'gpw_mar' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('gpw_mar')}
            className="rounded-xl shrink-0 text-text-secondary"
          >
            🇵🇱 GPW Insiderzy (MAR)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'live' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('live')}
            className="rounded-xl shrink-0 text-text-secondary"
          >
            ⚡ Live ({trades.length})
          </Button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'investors' ? (
          <Investors13FView />
        ) : activeTab === 'politicians' ? (
          <PoliticiansView trades={trades} />
        ) : activeTab === 'stocks' ? (
          <StocksHoldingView allCongressTrades={trades} />
        ) : activeTab === 'gpw_shorts' ? (
          <GpwShortsView />
        ) : activeTab === 'methodology' ? (
          <MethodologyView />
        ) : activeTab === 'gpw_mar' ? (
          <GpwPortfolioView />
        ) : (
          <LiveTradesView
            trades={trades}
            loading={loading}
            filters={filters}
            onFilterChange={handleFilterChange}
            clusterTickers={clusterTickers}
          />
        )}
      </div>

      <CopycatPlaybookModal
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
      />
    </div>
  );
};

export default InvestmentsPage;
