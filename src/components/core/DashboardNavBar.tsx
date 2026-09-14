import { createPortal } from 'react-dom';
import Button from '../ui/Button';
import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Badge from '../ui/Badge';
import { motion } from 'framer-motion';
import { IOS_SPRING } from '../../lib/motion/iosMotion';
import { useHaptics } from '../../hooks/useHaptics';

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface DashboardNavBarProps {
  view: string;
  navigateTo: (dest: string) => void;
  urgentTodoCount: number;
  navItems: NavItem[];
  tabOrder: string[];
  fastCaptureActive?: boolean;
  onFastCaptureToggle?: () => void;
  hidden?: boolean;
}

export function DashboardNavBar({
  view,
  navigateTo,
  urgentTodoCount,
  navItems,
  tabOrder: _tabOrder,
  fastCaptureActive,
  onFastCaptureToggle,
  hidden = false,
}: DashboardNavBarProps) {
  const haptics = useHaptics();

  const navContent = (
    <nav
      aria-label="Główna nawigacja"
      data-material="floating"
      className={`ui-floating-nav fixed left-1/2 z-[var(--z-modal)] flex w-[94%] max-w-[380px] -translate-x-1/2 items-center justify-between p-1.5 transition-opacity duration-150 ${
        hidden ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
      }`}
      style={{ bottom: 'max(14px, env(safe-area-inset-bottom))' }}
    >
      {navItems.map((item) => {
        const isActive = view === item.id;
        return (
          <Button
            key={item.id}
            variant="ghost"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              if (!isActive) haptics.selection();
              navigateTo(item.id);
            }}
            className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 px-0 min-w-0 h-auto transition-transform active:scale-95 hover:bg-transparent ${
              isActive ? 'text-text-primary font-bold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 rounded-full bg-black/5 dark:bg-white/15 shadow-sm -z-10 border border-black/10 dark:border-white/10"
                transition={IOS_SPRING.interactive}
              />
            )}
            <div className="relative">
              <item.icon size={18} className={`transition-transform duration-200 ${isActive ? 'scale-110 text-primary' : 'scale-100 opacity-70'}`} />
              {item.id === 'dzis' && urgentTodoCount > 0 && (
                <span className="absolute -top-1 -right-1.5 shadow-sm">
                  <Badge count={urgentTodoCount} color="var(--color-danger)" />
                </span>
              )}
            </div>
            <span className="text-3xs font-semibold tracking-tight">{item.label}</span>
          </Button>
        );
      })}

      {onFastCaptureToggle && (
        <Button
          variant="ghost"
          aria-expanded={fastCaptureActive}
          aria-label="Szybkie akcje"
          onClick={() => {
            haptics.selection();
            onFastCaptureToggle();
          }}
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 px-0 min-w-0 h-auto transition-transform active:scale-95 hover:bg-transparent text-primary"
        >
          {fastCaptureActive && (
            <motion.div
              layoutId="active-pill"
              className="absolute inset-0 rounded-full bg-primary/10 dark:bg-primary/20 shadow-sm -z-10 border border-primary/20"
              transition={IOS_SPRING.interactive}
            />
          )}
          <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/25 text-primary">
            <Plus
              size={16}
              strokeWidth={3}
              className={`text-primary transition-transform duration-200 ${
                fastCaptureActive
                  ? 'rotate-45 scale-110'
                  : 'scale-100 rotate-0'
              }`}
            />
          </div>
          <span className="text-3xs font-bold tracking-tight text-primary">Dodaj</span>
        </Button>
      )}
    </nav>
  );

  if (typeof document === 'undefined') {
    return navContent;
  }

  return createPortal(navContent, document.body);
}

