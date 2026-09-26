import { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Search, RefreshCw, BookOpen, Menu } from 'lucide-react';
import { TickerSearchModal } from './TickerSearchModal';

interface Props {
  onOpenPlaybook: () => void;
  onRefresh: () => void;
  syncing: boolean;
  onOpenMobileMenu?: () => void;
}

export const InvestmentsTopNav: FC<Props> = ({
  onOpenPlaybook,
  onRefresh,
  syncing,
  onOpenMobileMenu,
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
    <div className="relative mb-6 border-b border-border-custom/50 pb-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle + Brand */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Menu size={18} />}
              onClick={onOpenMobileMenu}
              className="lg:hidden rounded-xl p-2 text-text-secondary hover:text-text-primary"
              aria-label="Otwórz menu nawigacji"
            />
          )}

          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label="OrcaFolio">
              🐋
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-text-primary">
                  OrcaFolio
                </span>
                <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-success/10 text-success border border-success/20">
                  Otwarte · Bez logowania
                </span>
              </div>
              <p className="text-3xs text-text-secondary hidden sm:block">
                Radar 13F, Kongres USA, KNF Szorty & GPW Insiderzy
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-border-custom/60 mx-1 hidden sm:block" />

          {/* Global Ticker Search */}
          <Button
            size="sm"
            variant="secondary"
            icon={<Search size={13} />}
            onClick={() => setIsSearchOpen(true)}
            className="rounded-xl text-xs font-semibold"
          >
            Szukaj spółki
            <span className="ml-1.5 text-3xs font-mono text-text-muted hidden md:inline">⌘K</span>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
            className="rounded-xl text-xs font-semibold"
          >
            {syncing ? 'Aktualizacja...' : 'Odśwież'}
          </Button>
        </div>
      </div>

      {/* Global Ticker Search Modal */}
      <TickerSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
