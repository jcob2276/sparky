import { useEffect, useRef, useState, type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Short line under the large title (date, scope, status). */
  subtitle?: ReactNode;
  /** Left slot of the compact bar (back button, brand). */
  leading?: ReactNode;
  /** Right slot, always visible in both the large and the compact state. */
  actions?: ReactNode;
  className?: string;
}

/**
 * iOS-style screen header: a 34px large title that collapses into a 17px frosted bar on scroll.
 * The compact bar is sticky; the large title scrolls away and an IntersectionObserver swaps them.
 */
export default function PageHeader({ title, subtitle, leading, actions, className = '' }: PageHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <header className={className} data-collapsed={collapsed || undefined}>
      <div className={`sticky top-0 z-[var(--z-sticky)] flex min-h-[var(--toolbar-height)] items-center gap-2 px-4 ui-app-header transition-[border-color,background-color] duration-[var(--motion-fast)] ${collapsed ? '' : '!border-transparent !bg-transparent !backdrop-blur-none'}`}>
        <div className="flex min-w-11 shrink-0 items-center">{leading}</div>
        <p
          aria-hidden={!collapsed}
          className={`min-w-0 flex-1 truncate text-center text-base font-semibold tracking-tight text-text-primary transition-opacity duration-[var(--motion-fast)] ${collapsed ? 'opacity-100' : 'opacity-0'}`}
        >
          {title}
        </p>
        <div className="flex min-w-11 shrink-0 items-center justify-end gap-1">{actions}</div>
      </div>
      <div className="px-4 pb-3 pt-1">
        <h1 className="text-[length:var(--text-screen-title)] font-bold leading-tight tracking-[var(--tracking-screen-title)] text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </header>
  );
}
