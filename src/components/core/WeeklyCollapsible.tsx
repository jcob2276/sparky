import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

interface Props {
  icon: ReactNode;
  title: string;
  /** Jedna linia widoczna po zwinięciu: główny wskaźnik karty. */
  summary: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Karta tygodnia domyślnie zwinięta do jednej linii; szczegóły po dotknięciu. */
export default function WeeklyCollapsible({ icon, title, summary, className = '', children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`rounded-3xl border border-border-custom/60 bg-surface/70 ${className}`}>
      <Pressable
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex shrink-0 items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
          {icon} {title}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-text-primary">{summary}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </Pressable>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </section>
  );
}
