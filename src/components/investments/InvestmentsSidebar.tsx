import { FC } from 'react';
import { MainTabType } from './InvestmentsPage';
import Button from '../ui/Button';
import { useModalBackHandler } from '../../lib/investments/useModalBackHandler';
import {
  CircleDot,
  Wallet,
  MessageSquare,
  Diamond,
  Target,
  TrendingUp,
  Landmark,
  Share2,
  User,
  BarChart3,
  TrendingDown,
  Building2,
  X,
} from 'lucide-react';

interface Props {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  liveCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: MainTabType;
  label: string;
  icon: React.ReactNode;
}

const NAV_CENTRUM: NavItem[] = [
  { id: 'dashboard', label: 'Pulpit', icon: <CircleDot size={16} /> },
  { id: 'jakub_portfolio', label: 'Jakub Inwestycje', icon: <Wallet size={16} /> },
  { id: 'analyst', label: 'Analityk AI', icon: <MessageSquare size={16} /> },
  { id: 'watchlist', label: 'Watchlista', icon: <Diamond size={16} /> },
];

const NAV_RYNEK_USA: NavItem[] = [
  { id: 'convergence', label: 'Zbieżność', icon: <Target size={16} /> },
  { id: 'screener', label: 'Spółki', icon: <TrendingUp size={16} /> },
  { id: 'politicians', label: 'Kongres', icon: <Landmark size={16} /> },
  { id: 'investors', label: 'Superinwestorzy', icon: <Share2 size={16} /> },
  { id: 'live', label: 'Insiderzy', icon: <User size={16} /> },
  { id: 'simulation', label: 'Symulacja', icon: <BarChart3 size={16} /> },
];

const NAV_RYNEK_POLSKI: NavItem[] = [
  { id: 'gpw_mar', label: 'Spółki GPW', icon: <Building2 size={16} /> },
  { id: 'methodology', label: 'Fundamenty', icon: <BarChart3 size={16} /> },
  { id: 'gpw_shorts', label: 'Krótka sprzedaż', icon: <TrendingDown size={16} /> },
  { id: 'stocks', label: 'Insiderzy ESPI', icon: <User size={16} /> },
];

export const InvestmentsSidebar: FC<Props> = ({
  activeTab,
  onSelectTab,
  liveCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  // Obsługa gestu/przycisku 'Wstecz' na telefonie
  useModalBackHandler('investmentsSidebarMobile', isOpenMobile, onCloseMobile);

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <div className="px-3 text-3xs font-black uppercase tracking-wider text-text-muted mb-1.5">
        {title}
      </div>
      {items.map((item) => {
        const isSelected = activeTab === item.id;
        return (
          <Button
            key={item.id}
            size="sm"
            variant={isSelected ? 'tonal' : 'ghost'}
            onClick={() => {
              onSelectTab(item.id);
              onCloseMobile();
            }}
            className={`w-full justify-start rounded-xl px-3 py-2 text-xs transition-all ${
              isSelected
                ? 'border-l-4 border-primary font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface border-l-4 border-transparent font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className={isSelected ? 'text-primary' : 'text-text-muted'}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </div>
          </Button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between py-5 px-3 space-y-6 overflow-y-auto overflow-x-hidden touch-pan-y">
      <div className="space-y-6">
        {/* Brand Header with Close Button on Mobile */}
        <div className="px-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-primary">SP</span>
            <div>
              <div className="font-mono text-sm font-bold tracking-tight text-text-primary">
                Sparky
              </div>
              <p className="text-3xs font-mono text-text-muted">Inwestycje • Nawigacja</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse mr-1" title="Feed Live" />
            <Button
              size="sm"
              variant="ghost"
              icon={<X size={18} />}
              onClick={onCloseMobile}
              className="lg:hidden rounded-xl p-1.5 text-text-muted hover:text-text-primary"
              aria-label="Zamknij menu nawigacji"
              title="Zamknij menu"
            />
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-5">
          {renderNavGroup('CENTRUM', NAV_CENTRUM)}
          {renderNavGroup('RYNEK USA', NAV_RYNEK_USA)}
          {renderNavGroup('RYNEK POLSKI', NAV_RYNEK_POLSKI)}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-border-custom/40 px-1">
        <div className="p-3 rounded-2xl bg-surface border border-border-custom/50 shadow-xs space-y-1">
          <div className="text-3xs font-mono text-text-muted uppercase">Status synchronizacji</div>
          <div className="text-xs font-bold text-success flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            Live Feed: {liveCount} zdarzeń
          </div>
          <div className="text-3xs text-text-secondary">SEC 13F · STOCK Act · KNF</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border-custom/50 bg-background/80 backdrop-blur-md sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-scrim/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs sm:w-80 bg-background border-r border-border-custom h-full z-10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 ease-out">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
