import { FC } from 'react';
import { MainTabType } from './InvestmentsPage';
import Button from '../ui/Button';
import {
  LayoutDashboard,
  Bot,
  Star,
  Flame,
  Search,
  Landmark,
  Users,
  LineChart,
  ShieldAlert,
  Building2,
  FileText,
  BookOpen,
  Zap,
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
  badge?: string;
  badgeColor?: 'primary' | 'success' | 'danger';
}

const NAV_CENTRUM: NavItem[] = [
  { id: 'dashboard', label: 'Pulpit', icon: <LayoutDashboard size={16} /> },
  { id: 'analyst', label: 'Analityk AI', icon: <Bot size={16} /> },
  { id: 'watchlist', label: 'Watchlista', icon: <Star size={16} /> },
];

const NAV_RYNEK_USA: NavItem[] = [
  { id: 'convergence', label: 'Sygnały', icon: <Flame size={16} /> },
  { id: 'screener', label: 'Spółki (13F)', icon: <Search size={16} /> },
  { id: 'politicians', label: 'Kongres', icon: <Landmark size={16} /> },
  { id: 'investors', label: 'Superinwestorzy', icon: <Users size={16} /> },
  { id: 'live', label: 'Insiderzy Form 4', icon: <Zap size={16} /> },
  { id: 'simulation', label: 'Symulacja', icon: <LineChart size={16} /> },
];

const NAV_RYNEK_POLSKI: NavItem[] = [
  { id: 'gpw_shorts', label: 'Krótka sprzedaż', icon: <ShieldAlert size={16} /> },
  { id: 'gpw_mar', label: 'Spółki GPW', icon: <Building2 size={16} /> },
  { id: 'stocks', label: 'Insiderzy ESPI', icon: <FileText size={16} /> },
  { id: 'methodology', label: 'Fundamenty', icon: <BookOpen size={16} /> },
];

export const InvestmentsSidebar: FC<Props> = ({
  activeTab,
  onSelectTab,
  liveCount,
  isOpenMobile,
  onCloseMobile,
}) => {
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
            variant={isSelected ? 'primary' : 'ghost'}
            onClick={() => {
              onSelectTab(item.id);
              onCloseMobile();
            }}
            className={`w-full justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              isSelected
                ? 'shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className={isSelected ? 'text-text-on-primary' : 'text-text-muted'}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`px-1.5 py-0.2 rounded text-3xs font-mono font-bold ${
                  isSelected
                    ? 'bg-surface/30 text-text-on-primary'
                    : item.badgeColor === 'danger'
                    ? 'bg-danger/10 text-danger border border-danger/20'
                    : item.badgeColor === 'success'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between py-5 px-3 space-y-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Brand */}
        <div className="px-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-primary">SP</span>
            <div>
              <div className="font-mono text-sm font-bold tracking-tight text-text-primary">
                Sparky
              </div>
              <p className="text-3xs font-mono text-text-muted">jeden użytkownik</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="Feed Live" />
        </div>

        {/* Groups */}
        <div className="space-y-5">
          {renderNavGroup('CENTRUM', NAV_CENTRUM)}
          {renderNavGroup('RYNEK USA', NAV_RYNEK_USA)}
          {renderNavGroup('RYNEK POLSKI', NAV_RYNEK_POLSKI)}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-border-custom/40 px-3">
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
        <div className="lg:hidden fixed top-0 left-0 right-0 bottom-0 z-50 flex">
          <div
            className="fixed top-0 left-0 right-0 bottom-0 bg-scrim/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs bg-background border-r border-border-custom h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
