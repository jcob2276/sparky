import type { ReactNode } from 'react';

interface OuraSectionHeaderProps {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** Jeden wygląd nagłówka sekcji dla zakładek Dziś i Szczegóły. */
export function OuraSectionHeader({ id, title, subtitle, action }: OuraSectionHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-2xl font-light text-text-primary">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm leading-6 text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
