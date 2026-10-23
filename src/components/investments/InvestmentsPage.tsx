import { FC, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInvestmentsData } from './useInvestmentsData';
import { InvestmentsTopNav } from './InvestmentsTopNav';
import { InvestmentsSidebar } from './InvestmentsSidebar';
import { InvestmentsStatusStrip } from './InvestmentsStatusStrip';
import { TickerSearchModal } from './TickerSearchModal';
import { CopycatPlaybookModal } from './CopycatPlaybookModal';
import { InvestmentsTabRenderer } from './InvestmentsTabRenderer';
import { loadStoredWatchlist, saveStoredWatchlist } from '../../lib/investments/watchlistStorage';
import { useInvestmentsShell } from './useInvestmentsShell';

export type MainTabType =
  | 'dashboard'
  | 'jakub_portfolio'
  | 'kondzio_portfolio'
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

const VALID_TABS: ReadonlySet<MainTabType> = new Set([
  'dashboard',
  'jakub_portfolio',
  'kondzio_portfolio',
  'analyst',
  'watchlist',
  'convergence',
  'screener',
  'investors',
  'politicians',
  'simulation',
  'stocks',
  'gpw_shorts',
  'gpw_mar',
  'live',
  'methodology',
]);

const InvestmentsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as MainTabType | null;
  const activeTab: MainTabType = tabParam && VALID_TABS.has(tabParam) ? tabParam : 'dashboard';

  const [watchlist, setWatchlist] = useState<string[]>(loadStoredWatchlist);

  const handleSelectTab = useCallback(
    (tab: MainTabType, prompt?: string) => {
      if (tab === activeTab && !prompt) return;
      const nextParams: Record<string, string> = {};
      if (tab !== 'dashboard') {
        nextParams.tab = tab;
      }
      if (prompt?.trim()) {
        nextParams.q = prompt.trim();
      }
      setSearchParams(nextParams, { replace: false });
    },
    [activeTab, setSearchParams]
  );

  const goDashboard = useCallback(() => handleSelectTab('dashboard'), [handleSelectTab]);
  const {
    isPlaybookOpen,
    isMobileMenuOpen,
    isSearchOpen,
    handleBack,
    handleOpenMobileMenu,
    handleCloseMobileMenu,
    handleOpenPlaybook,
    handleClosePlaybook,
    handleOpenSearch,
    handleCloseSearch,
  } = useInvestmentsShell(activeTab, goDashboard);

  const handleToggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      saveStoredWatchlist(next);
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
    historyTruncated,
    refreshRevision,
    latestTradeIso,
  } = useInvestmentsData();

  return (
    <div className="min-h-screen bg-background text-text-primary flex w-full max-w-full overflow-x-hidden">
      <InvestmentsSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        liveCount={trades.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={handleCloseMobileMenu}
        onOpenSearch={handleOpenSearch}
        latestTradeIso={latestTradeIso}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full max-w-full">
          {/* Connected Top Navigation Bar */}
          <InvestmentsTopNav
            activeTab={activeTab}
            onBack={handleBack}
            onOpenPlaybook={handleOpenPlaybook}
            onRefresh={handleRefresh}
            syncing={syncing}
            onOpenMobileMenu={handleOpenMobileMenu}
            onOpenSearch={handleOpenSearch}
          />
          <InvestmentsStatusStrip latestTradeIso={latestTradeIso} tradeCount={trades.length} loading={loading} />
        </div>

        {/* Tab Contents View */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-full min-w-0 overflow-x-hidden">
          <InvestmentsTabRenderer key={activeTab === 'analyst' ? 'analyst' : refreshRevision}
            activeTab={activeTab}
            onNavigateTab={handleSelectTab}
            trades={trades}
            loading={loading}
            filters={filters}
            onFilterChange={handleFilterChange}
            clusterTickers={clusterTickers}
            historyTruncated={historyTruncated}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
          />
        </main>
      </div>

      <TickerSearchModal isOpen={isSearchOpen} onClose={handleCloseSearch} />
      <CopycatPlaybookModal
        isOpen={isPlaybookOpen}
        onClose={handleClosePlaybook}
      />
    </div>
  );
};

export default InvestmentsPage;
