import { FC, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInvestmentsData } from './useInvestmentsData';
import { InvestmentsTopNav } from './InvestmentsTopNav';
import { InvestmentsSidebar } from './InvestmentsSidebar';
import { CopycatPlaybookModal } from './CopycatPlaybookModal';
import { InvestmentsTabRenderer } from './InvestmentsTabRenderer';
import { loadStoredWatchlist, saveStoredWatchlist } from '../../lib/investments/watchlistStorage';
import { useBackHandler } from '../../lib/native/backStack';

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

export const InvestmentsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab') as MainTabType | null;
  const activeTab: MainTabType = tabParam && VALID_TABS.has(tabParam) ? tabParam : 'dashboard';

  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const handleBack = useCallback(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      return;
    }
    if (isPlaybookOpen) {
      setIsPlaybookOpen(false);
      return;
    }
    if (activeTab !== 'dashboard') {
      handleSelectTab('dashboard');
      return;
    }
    navigate('/');
  }, [isMobileMenuOpen, isPlaybookOpen, activeTab, handleSelectTab, navigate]);

  const handleOpenMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
    window.history.pushState({ modal: 'mobileMenu' }, '');
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    if (window.history.state?.modal === 'mobileMenu') {
      window.history.back();
    }
  }, []);

  const handleOpenPlaybook = useCallback(() => {
    setIsPlaybookOpen(true);
    window.history.pushState({ modal: 'playbook' }, '');
  }, []);

  const handleClosePlaybook = useCallback(() => {
    setIsPlaybookOpen(false);
    if (window.history.state?.modal === 'playbook') {
      window.history.back();
    }
  }, []);

  // Browser popstate handler for drawers and modals
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const modalInState = e.state?.modal;
      if (isMobileMenuOpen && modalInState !== 'mobileMenu') {
        setIsMobileMenuOpen(false);
      }
      if (isPlaybookOpen && modalInState !== 'playbook') {
        setIsPlaybookOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileMenuOpen, isPlaybookOpen]);

  // Native Android/Capacitor hardware back button hygiene
  useBackHandler(() => {
    if (isMobileMenuOpen) {
      handleCloseMobileMenu();
      return true;
    }
    if (isPlaybookOpen) {
      handleClosePlaybook();
      return true;
    }
    if (activeTab !== 'dashboard') {
      handleSelectTab('dashboard');
      return true;
    }
    navigate('/');
    return true;
  }, true);

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
  } = useInvestmentsData();

  return (
    <div className="min-h-screen bg-background text-text-primary flex w-full max-w-full overflow-x-hidden">
      {/* 1:1 OrcaFolio Left Sidebar */}
      <InvestmentsSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        liveCount={trades.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={handleCloseMobileMenu}
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
          />
        </div>

        {/* Tab Contents View */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-full min-w-0 overflow-x-hidden">
          <InvestmentsTabRenderer
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

      <CopycatPlaybookModal
        isOpen={isPlaybookOpen}
        onClose={handleClosePlaybook}
      />
    </div>
  );
};

export default InvestmentsPage;
