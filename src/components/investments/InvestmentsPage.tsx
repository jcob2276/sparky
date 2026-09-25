import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestmentsData } from './useInvestmentsData';
import { InvestmentsHeader } from './InvestmentsHeader';
import { CopycatPlaybookModal } from './CopycatPlaybookModal';
import { PelosiPortfolioView } from './PelosiPortfolioView';
import { TrumpPortfolioView } from './TrumpPortfolioView';
import { ClustersRankingView } from './ClustersRankingView';
import { GpwPortfolioView } from './GpwPortfolioView';
import { LiveTradesView } from './LiveTradesView';
import Button from '../ui/Button';

export type MainTabType = 'pelosi' | 'clusters' | 'gpw' | 'trump' | 'live';

export const InvestmentsPage: FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MainTabType>('pelosi');
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
        {/* Navigation back bar */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            ← Wróć do aplikacji
          </Button>

          <span className="text-xs font-mono text-text-muted">
            Sparky OS · Moduł Finansowy (USA & GPW)
          </span>
        </div>

        <InvestmentsHeader
          stats={stats}
          syncing={syncing}
          onRefresh={handleRefresh}
          onOpenPlaybook={() => setIsPlaybookOpen(true)}
        />

        {/* Master Navigation Tabs — Quiver Quantitative & Bloomberg Grade */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-border-custom/50">
          <Button
            size="sm"
            variant={activeTab === 'pelosi' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('pelosi')}
            className="rounded-xl shrink-0"
          >
            🏛 Nancy Pelosi (Deep Dive)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'clusters' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('clusters')}
            className="rounded-xl shrink-0"
          >
            🔥 Klastry & Top Tickers
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'gpw' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('gpw')}
            className="rounded-xl shrink-0"
          >
            🇵🇱 GPW Warszawa (MAR)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'trump' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('trump')}
            className="rounded-xl shrink-0"
          >
            🦅 Donald Trump
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'live' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('live')}
            className="rounded-xl shrink-0"
          >
            ⚡ Wszystkie transakcje Live ({trades.length})
          </Button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'pelosi' ? (
          <PelosiPortfolioView />
        ) : activeTab === 'clusters' ? (
          <ClustersRankingView allTrades={trades} />
        ) : activeTab === 'gpw' ? (
          <GpwPortfolioView />
        ) : activeTab === 'trump' ? (
          <TrumpPortfolioView />
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
