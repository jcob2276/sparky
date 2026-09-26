import { FC, useState, useCallback } from 'react';
import { useInvestmentsData } from './useInvestmentsData';
import { InvestmentsTopNav } from './InvestmentsTopNav';
import { InvestmentsHeader } from './InvestmentsHeader';
import { CopycatPlaybookModal } from './CopycatPlaybookModal';
import { InvestmentsTabsBar } from './InvestmentsTabsBar';
import { InvestmentsTabRenderer } from './InvestmentsTabRenderer';

export type MainTabType =
  | 'dashboard'
  | 'analyst'
  | 'watchlist'
  | 'convergence'
  | 'screener'
  | 'investors'
  | 'politicians'
  | 'simulation'
  | 'stocks'
  | 'gpw_shorts'
  | 'gpw_mar'
  | 'live'
  | 'methodology';

const LS_KEY = 'sparky_investments_watchlist';

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return ['AMZN', 'NVDA', 'DNP', 'CDR'];
    return JSON.parse(raw) as string[];
  } catch {
    return ['AMZN', 'NVDA', 'DNP', 'CDR'];
  }
}

export const InvestmentsPage: FC = () => {
  const [activeTab, setActiveTab] = useState<MainTabType>('dashboard');
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);

  const handleToggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

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

        {activeTab !== 'dashboard' && (
          <InvestmentsHeader
            stats={stats}
            syncing={syncing}
            onRefresh={handleRefresh}
            onOpenPlaybook={() => setIsPlaybookOpen(true)}
          />
        )}

        {/* Master Navigation Tabs — 1:1 OrcaFolio Full Suite */}
        <InvestmentsTabsBar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          liveCount={trades.length}
        />

        {/* Tab Contents View */}
        <InvestmentsTabRenderer
          activeTab={activeTab}
          onNavigateTab={(tab) => setActiveTab(tab as MainTabType)}
          trades={trades}
          loading={loading}
          filters={filters}
          onFilterChange={handleFilterChange}
          clusterTickers={clusterTickers}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
        />
      </div>

      <CopycatPlaybookModal
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
      />
    </div>
  );
};

export default InvestmentsPage;
