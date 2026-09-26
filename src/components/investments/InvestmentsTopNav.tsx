import { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Search, RefreshCw, BookOpen, Menu, ArrowLeft } from 'lucide-react';
import { TickerSearchModal } from './TickerSearchModal';
import { MarketStatusBadge } from './MarketStatusBadge';
import type { MainTabType } from './InvestmentsPage';

interface Props {
  onOpenPlaybook: () => void;
  onRefresh: () => void;
  syncing: boolean;
  onOpenMobileMenu?: () => void;
  activeTab?: MainTabType;
  onBack?: () => void;
}

export const InvestmentsTopNav: FC<Props> = ({
  onOpenPlaybook,
  onRefresh,
  syncing,
  onOpenMobileMenu,
  activeTab,
  onBack,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Open search on Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative mb-6 border-b border-border-custom/50 pb-4 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        {/* Left: Back + Mobile Toggle + Brand */}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0 shrink-0">
          {onBack && (
            <Button
              size="sm"
              variant="ghost"
              icon={<ArrowLeft size={18} />}
              onClick={onBack}
              className="rounded-xl p-2 text-text-secondary hover:text-text-primary shrink-0"
              aria-label={activeTab === 'dashboard' ? 'Wróć do Sparky' : 'Wróć do pulpitu'}
              title={activeTab === 'dashboard' ? 'Wróć do Sparky' : 'Wróć do pulpitu'}
            />
          )}

          {onOpenMobileMenu && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Menu size={18} />}
              onClick={onOpenMobileMenu}
              className="lg:hidden rounded-xl p-2 text-text-secondary hover:text-text-primary shrink-0"
              aria-label="Otwórz menu nawigacji"
              title="Otwórz menu nawigacji"
            />
          )}

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <span className="font-mono text-xs font-bold text-primary">SP</span>
            <div className="leading-tight">
              <div className="font-mono text-xs sm:text-sm font-bold tracking-tight text-text-primary">
                Sparky
              </div>
              <p className="text-3xs font-mono text-text-secondary hidden sm:block">
                13F · Kongres · Form 4 · GPW
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-border-custom/60 mx-0.5 sm:mx-1 hidden sm:block" />

          {/* Global Ticker Search */}
          <Button
            size="sm"
            variant="secondary"
            icon={<Search size={14} />}
            onClick={() => setIsSearchOpen(true)}
            className="rounded-xl text-xs font-semibold px-2.5 sm:px-3 shrink-0"
            aria-label="Szukaj spółki"
            title="Szukaj spółki (⌘K)"
          >
            <span className="hidden sm:inline">Szukaj spółki</span>
            <span className="ml-1.5 text-3xs font-mono text-text-muted hidden md:inline">⌘K</span>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <MarketStatusBadge />

          <Button
            size="sm"
            variant="secondary"
            icon={<BookOpen size={13} />}
            onClick={onOpenPlaybook}
            className="hidden sm:inline-flex rounded-xl text-xs font-semibold"
          >
            Playbook
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />}
            onClick={onRefresh}
            disabled={syncing}
            loading={syncing}
            className="rounded-xl text-xs font-semibold px-2.5 sm:px-3 shrink-0"
            aria-label={syncing ? 'Aktualizacja...' : 'Odśwież'}
            title={syncing ? 'Aktualizacja...' : 'Odśwież'}
          >
            <span className="hidden sm:inline">{syncing ? 'Aktualizacja...' : 'Odśwież'}</span>
          </Button>
        </div>
      </div>

      {/* Global Ticker Search Modal */}
      <TickerSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
