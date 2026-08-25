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
}

function WorkspaceSidebarInner({
  children,
  className = '',
  onCollapse,
}: {
  children: ReactNode;
  className?: string;
  onCollapse?: () => void;
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={className} mobileTitle="Kalendarz">
      <SidebarHeader className={`flex items-center py-2 px-3 border-b border-border-custom/20 mb-1.5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <span className="pixel-label text-text-muted/60 tracking-wider">Workspace</span>
        )}
        {/* Mobile: toggle sheet via context. Desktop: sync external collapsed flag. */}
        <SidebarTrigger
          onClick={isMobile ? undefined : onCollapse}
          className="hover:bg-surface-2 rounded-lg"
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
}: WorkspaceSidebarProps) {
  const inner = (
    <WorkspaceSidebarInner className={className} onCollapse={onCollapse}>
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
