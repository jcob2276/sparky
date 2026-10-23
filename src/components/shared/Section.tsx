import type { ReactNode } from 'react';
import SectionTitle from '../ui/SectionTitle';

interface SectionProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

function Section({ title, description, actions, children, className = '' }: SectionProps) {
  return (
    <section className={`grid gap-[var(--space-4)] ${className}`}>
      {(title || description || actions) && (
        <header className="flex items-end justify-between gap-[var(--space-4)]">
          <div className="min-w-0">
            {title && <SectionTitle>{title}</SectionTitle>}
            {description && <p className="mt-[var(--space-1)] text-xs leading-relaxed text-text-muted">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export default Section;
