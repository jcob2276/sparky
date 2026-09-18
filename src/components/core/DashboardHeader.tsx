import { Pressable } from '../ui/ControlPrimitives';
import { Link } from 'react-router-dom';
import { formatDashboardDate } from '../../lib/date';
import {
  Moon,
  Sun,
  LayoutDashboard,
} from 'lucide-react';
import { BrandTitle } from '../ui/BrandTitle';
import { useHaptics } from '../../hooks/useHaptics';
import OuraRingHeaderBadge from '../desktop/health/OuraRingHeaderBadge';
import { queryClient } from '../../lib/queryClient';
import { desktopKeys } from '../../lib/queryKeys';
import { fetchDesktopDashboardData } from '../../lib/desktopDashboardApi';


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
  onSearchClick: _onSearchClick,
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
    <header className="sticky top-0 z-[var(--z-sticky)] pt-safe-top h-14 flex items-center justify-between gap-4 border-b border-border-custom/50 bg-background/80 px-4 sm:px-5 backdrop-blur-xs shadow-2xs transition-colors">
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
          <h1 className="font-display text-sm font-black tracking-widest text-primary transition-opacity group-hover:opacity-90">
            <BrandTitle />
          </h1>
          <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success shadow-xs" />
          </span>
        </div>
        <p className="text-2xs font-medium tracking-tight text-text-muted capitalize">
          {formatDashboardDate()}
        </p>
      </div>

      <div className="header-icon-row flex min-w-0 items-center gap-2 overflow-x-auto">
        {/* Oura ring badge retained in code per architecture, hidden from header UI */}
        {(false as boolean) && <OuraRingHeaderBadge />}

        <Pressable
          onClick={() => { selection(); toggleTheme(); }}
          variant="ghost"
          className="!h-9 !w-9 !p-0 !rounded-full border border-border-custom/60 bg-surface-solid/50 text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-90 ui-interactive flex items-center justify-center shadow-xs"
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
            className="h-9 w-9 shrink-0 rounded-full border border-border-custom/60 bg-surface-solid/50 text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-90 ui-interactive flex items-center justify-center shadow-xs"
            title="Desktop dashboard"
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
          </Link>
        )}
      </div>
    </header>
  );
}




