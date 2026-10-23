import { Pressable } from '../ui/ControlPrimitives';
import { Link } from 'react-router-dom';
import { formatDashboardDate } from '../../lib/date';
import {
  Moon,
  Sun,
  LayoutDashboard,
  Search,
  Settings,
} from 'lucide-react';
import { BrandTitle } from '../ui/BrandTitle';
import { useHaptics } from '../../hooks/useHaptics';
import { queryClient } from '../../lib/queryClient';
import { desktopKeys } from '../../lib/queryKeys';
import { fetchDesktopDashboardData } from '../../lib/desktopDashboardApi';


const ICON_BUTTON_CLASS = '!h-11 !w-11 shrink-0 !p-0 !rounded-full border border-border-custom/60 bg-surface-solid text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-90 ui-interactive flex items-center justify-center shadow-xs';

interface DashboardHeaderProps {
  userId: string | undefined;
  unreadCount: number;
  onAvatarLongPress: () => void;
  onAvatarClick: () => void;
  theme: string;
  toggleTheme: () => void;
  showLock: boolean;
  view: string;
  onShortcutClick: (dest: string) => void;
  onSearchClick?: () => void;
  staleNoteCount: number;
  handleLogoPressStart: () => void;
  handleLogoPressEnd: () => void;
}

export function DashboardHeader({
  userId: _userId,
  unreadCount: _unreadCount,
  onAvatarLongPress: _onAvatarLongPress,
  onAvatarClick: _onAvatarClick,
  theme,
  toggleTheme,
  showLock,
  view: _view,
  onShortcutClick: _onShortcutClick,
  onSearchClick,
  staleNoteCount: _staleNoteCount,
  handleLogoPressStart,
  handleLogoPressEnd,
}: DashboardHeaderProps) {
  const { medium, selection } = useHaptics();

  const handlePrefetchDashboard = () => {
    void import('../desktop/shell/DesktopDashboard');
    if (_userId) {
      void queryClient.prefetchQuery({
        queryKey: desktopKeys.dashboard(_userId),
        queryFn: () => fetchDesktopDashboardData(_userId),
        staleTime: 1000 * 60 * 5,
      });
    }
  };

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] pt-safe-top min-h-14 py-2 flex items-center justify-between gap-4 ui-app-header px-4 sm:px-5">
      <div className="min-w-0 shrink-0 select-none">
        <div
          role="button"
          tabIndex={0}
          className="group inline-flex items-center gap-2 cursor-pointer touch-manipulation transition-transform active:scale-95"
          title="Przytrzymaj, żeby szybko dodać posiłek"
          onPointerDown={() => { medium(); handleLogoPressStart(); }}
          onPointerUp={handleLogoPressEnd}
          onPointerLeave={handleLogoPressEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <h1 className="font-display text-sm font-semibold tracking-wide text-primary transition-opacity group-hover:opacity-90">
            <BrandTitle />
          </h1>
        </div>
        <p className="text-xs font-medium text-text-muted capitalize">
          {formatDashboardDate()}
        </p>
      </div>

      <div className="header-icon-row flex min-w-0 items-center gap-1.5">

        {onSearchClick && (
          <Pressable
            onClick={() => { selection(); onSearchClick(); }}
            variant="ghost"
            className={ICON_BUTTON_CLASS}
            aria-label="Szukaj"
            title="Szukaj"
          >
            <Search size={18} strokeWidth={1.8} />
          </Pressable>
        )}

        <Link
          to="/settings"
          onClick={() => selection()}
          className={ICON_BUTTON_CLASS}
          aria-label="Ustawienia"
          title="Ustawienia"
        >
          <Settings size={18} strokeWidth={1.8} />
        </Link>

        <Pressable
          onClick={() => { selection(); toggleTheme(); }}
          variant="ghost"
          className={ICON_BUTTON_CLASS}
          aria-label={theme === 'light' ? 'Przełącz na tryb ciemny' : 'Przełącz na tryb jasny'}
          title={theme === 'light' ? 'Przełącz na tryb ciemny' : 'Przełącz na tryb jasny'}
        >
          {theme === 'light' ? (
            <Moon size={15} strokeWidth={1.8} />
          ) : (
            <Sun size={15} strokeWidth={1.8} className="text-warning" />
          )}
        </Pressable>

        {!showLock && (
          <Link
            to="/dashboard"
            onClick={() => selection()}
            onMouseEnter={handlePrefetchDashboard}
            onTouchStart={handlePrefetchDashboard}
            onFocus={handlePrefetchDashboard}
            className={ICON_BUTTON_CLASS}
            aria-label="Desktop dashboard"
            title="Desktop dashboard"
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
          </Link>
        )}
      </div>
    </header>
  );
}
