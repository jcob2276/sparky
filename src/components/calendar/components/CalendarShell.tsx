import type { ReactNode } from 'react';
import { SidebarProvider } from '../../ui/sidebar';
import Fab from '../../ui/Fab';
import WorkspaceNavigation from '../../shared/WorkspaceNavigation';

interface CalendarShellProps {
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateTo?: (dest: string) => void;
  onQuickCreate: () => void;
  toastMessage: string | null;
  sidebar: ReactNode;
  children: ReactNode;
}

/** Layout chrome: SidebarProvider wraps header+sidebar so mobile sheet has a trigger. */
export default function CalendarShell({
  sidebarCollapsed,
  onToggleCollapse,
  onNavigateTo,
  onQuickCreate,
  toastMessage,
  sidebar,
  children,
}: CalendarShellProps) {
  return (
    <SidebarProvider
      defaultOpen={!sidebarCollapsed}
      open={!sidebarCollapsed}
      onOpenChange={(openState) => {
        if (openState === sidebarCollapsed) onToggleCollapse();
      }}
      collapsible="icon"
      variant="sidebar"
    >
      <div className="calendar-shell relative flex h-dvh overflow-hidden bg-background font-sans touch-manipulation">
        {sidebar}
        <div className="calendar-main flex min-w-0 flex-1 flex-col bg-surface/5">
          {children}
        </div>

        <Fab
          position="custom"
          size="lg"
          onClick={onQuickCreate}
          className="calendar-fab fixed right-4 z-[var(--z-overlay)] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-accent shadow-2xl transition-transform active:scale-95 md:hidden"
          title="Dodaj nowe wydarzenie"
        >
          <span className="text-2xl font-bold">+</span>
        </Fab>

        <WorkspaceNavigation
          active="kalendarz"
          orientation="horizontal"
          onNavigate={onNavigateTo}
          className="md:hidden z-[var(--z-overlay)]"
        />

        {toastMessage && (
          <div className="calendar-toast fixed left-1/2 z-[var(--z-emergency)] -translate-x-1/2 rounded-xl bg-text-primary px-4 py-3 text-xs font-black uppercase tracking-wider text-background shadow-lg animate-in slide-in-from-bottom duration-[var(--motion-medium)] md:left-auto md:right-4 md:translate-x-0">
            {toastMessage}
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
