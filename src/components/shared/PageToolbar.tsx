import type { ReactNode } from 'react';

interface PageToolbarProps {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  center?: ReactNode;
  actions?: ReactNode;
  navigation?: ReactNode;
  hideNavigationOnMobile?: boolean;
}

function PageToolbar({ title, description, leading, center, actions, navigation, hideNavigationOnMobile }: PageToolbarProps) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-custom/40 bg-background/75 glass-elevated">
      <div className="flex min-h-[var(--toolbar-height)] items-center gap-[var(--space-3)] px-[var(--space-4)] md:px-[var(--space-6)]">
        {leading}
        <div className="min-w-0 shrink-0 max-w-[min(55vw,26rem)]">
          <h1 className="truncate text-base font-bold tracking-tight text-text-primary md:text-xl">{title}</h1>
          {description && <p className="truncate text-xs text-text-muted">{description}</p>}
        </div>
        <div className="min-w-0 flex-1">{center}</div>
        <div className="flex shrink-0 items-center gap-[var(--space-1)]">{actions}</div>
      </div>
      {navigation && (
        <div className={`${hideNavigationOnMobile ? 'hidden md:block ' : ''}px-[var(--space-4)] pb-[var(--space-2)] md:px-[var(--space-6)]`}>
          <div className="mx-auto max-w-[var(--content-narrow)]">{navigation}</div>
        </div>
      )}
    </header>
  );
}

export default PageToolbar;
