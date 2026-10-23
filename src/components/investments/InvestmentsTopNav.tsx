import { FC } from 'react';
import Button from '../ui/Button';
import { Search, RefreshCw, BookOpen, Menu, ArrowLeft } from 'lucide-react';
import { MarketStatusBadge } from './MarketStatusBadge';
import type { MainTabType } from './InvestmentsPage';

interface Props {
  onOpenPlaybook: () => void;
  onRefresh: () => void;
  syncing: boolean;
  onOpenMobileMenu?: () => void;
  onOpenSearch: () => void;
  activeTab?: MainTabType;
  onBack?: () => void;
}

export const InvestmentsTopNav: FC<Props> = ({
  onOpenPlaybook,
  onRefresh,
  syncing,
  onOpenMobileMenu,
  onOpenSearch,
  activeTab,
  onBack,
}) => {
  const iconButton = 'h-11 w-11 shrink-0 rounded-full p-0 text-text-secondary hover:text-text-primary';
  const backLabel = activeTab === 'dashboard' ? 'Wróć do Sparky' : 'Wróć do pulpitu';

  return (
    <div className="relative mb-4 w-full max-w-full">
      <div className="flex w-full min-w-0 items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-0.5">
          {onBack && (
            <Button size="sm" variant="ghost" icon={<ArrowLeft size={20} />} onClick={onBack} className={iconButton} aria-label={backLabel} title={backLabel} />
          )}
          {onOpenMobileMenu && (
            <Button size="sm" variant="ghost" icon={<Menu size={20} />} onClick={onOpenMobileMenu} className={`lg:hidden ${iconButton}`} aria-label="Otwórz menu nawigacji" title="Otwórz menu nawigacji" />
          )}
          <h1 className="ml-1 hidden truncate text-lg font-semibold text-text-primary sm:block">Inwestycje</h1>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <MarketStatusBadge />
          <Button size="sm" variant="ghost" icon={<Search size={18} />} onClick={onOpenSearch} className={iconButton} aria-label="Szukaj spółki" title="Szukaj spółki (Ctrl/⌘ + K)" />
          <Button size="sm" variant="ghost" icon={<BookOpen size={18} />} onClick={onOpenPlaybook} className={`hidden sm:inline-flex ${iconButton}`} aria-label="Playbook" title="Playbook" />
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />}
            onClick={onRefresh}
            disabled={syncing}
            className={iconButton}
            aria-label={syncing ? 'Aktualizacja...' : 'Odśwież'}
            title={syncing ? 'Aktualizacja...' : 'Odśwież'}
          />
        </div>
      </div>

    </div>
  );
};
