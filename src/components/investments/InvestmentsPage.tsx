import { FC, useState, useCallback } from 'react';
import { useInvestmentsData } from './useInvestmentsData';
import { InvestmentsTopNav } from './InvestmentsTopNav';
import { InvestmentsSidebar } from './InvestmentsSidebar';
import { CopycatPlaybookModal } from './CopycatPlaybookModal';
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
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : ['AMZN', 'NVDA', 'DNP', 'CDR'];
  } catch {
    return ['AMZN', 'NVDA', 'DNP', 'CDR'];
  }
}

export const InvestmentsPage: FC = () => {
  const [activeTab, setActiveTab] = useState<MainTabType>('dashboard');
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    loading,
    syncing,
    filters,
    handleRefresh,
    handleFilterChange,
    clusterTickers,
  } = useInvestmentsData();

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* 1:1 OrcaFolio Left Sidebar */}
      <InvestmentsSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        liveCount={trades.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          {/* Connected Top Navigation Bar */}
          <InvestmentsTopNav
            onOpenPlaybook={() => setIsPlaybookOpen(true)}
            onRefresh={handleRefresh}
            syncing={syncing}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
        </div>

        {/* Tab Contents View */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 w-full">
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
        </main>
      </div>

      <CopycatPlaybookModal
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
      />
    </div>
  );
};

export default InvestmentsPage;
