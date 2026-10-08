import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarRail, useSidebar } from '../ui/sidebar';

export interface WorkspaceSidebarProps {
  children: ReactNode;
  collapsed?: boolean;
  className?: string;
  onCollapse?: () => void;
  collapsible?: 'offcanvas' | 'icon' | 'none';
  variant?: 'sidebar' | 'floating' | 'inset';
  /** When false, parent must wrap with SidebarProvider (e.g. calendar mobile trigger in header). */
  provideContext?: boolean;
  mobileTitle?: string;
}

function WorkspaceSidebarInner({
  children,
  className = '',
  onCollapse,
  mobileTitle = 'Kalendarz',
}: {
  children: ReactNode;
  className?: string;
  onCollapse?: () => void;
  mobileTitle?: string;
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={className} mobileTitle={mobileTitle}>
      <SidebarHeader className={`flex items-center py-2 px-3 border-b border-border-custom/20 mb-1.5 ${isCollapsed ? 'justify-center px-1' : 'justify-between'}`}>
        {!isCollapsed && (
          <span className="pixel-label text-text-muted/60 tracking-wider">Workspace</span>
        )}
        {/* Mobile: toggle sheet via context. Desktop: sync external collapsed flag. */}
        <SidebarTrigger
          onClick={isMobile ? undefined : onCollapse}
          className="hover:bg-surface-2 rounded-xl"
        />
      </SidebarHeader>
      {children}
      <SidebarRail />
    </Sidebar>
  );
}

export default function WorkspaceSidebar({
  children,
  collapsed,
  className = '',
  onCollapse,
  collapsible = 'icon',
  variant = 'sidebar',
  provideContext = true,
  mobileTitle,
}: WorkspaceSidebarProps) {
  const inner = (
    <WorkspaceSidebarInner className={className} onCollapse={onCollapse} mobileTitle={mobileTitle}>
      {children}
    </WorkspaceSidebarInner>
  );

  if (!provideContext) return inner;

  return (
    <SidebarProvider
      defaultOpen={collapsed !== undefined ? !collapsed : true}
      open={collapsed !== undefined ? !collapsed : undefined}
      onOpenChange={(openState) => {
        if (collapsed !== undefined && openState === collapsed && onCollapse) {
          onCollapse();
        }
      }}
      collapsible={collapsible}
      variant={variant}
    >
      {inner}
    </SidebarProvider>
  );
}
