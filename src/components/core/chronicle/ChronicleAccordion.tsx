import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  title: string;
  /** Jedna linia widoczna po zwinięciu: najważniejsze liczby z sekcji. */
  preview?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Zwijana sekcja Kroniki: tytuł i podgląd w jednej linii, zawartość montuje się dopiero po otwarciu. */
export default function ChronicleAccordion({ title, preview, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="rounded-3xl border border-border-custom/60 bg-surface/70">
      <Pressable
        type="button"
        haptic="none"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-solid/50 ui-interactive"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {preview && !open && <p className="truncate text-2xs font-semibold tabular-nums text-text-muted">{preview}</p>}
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-text-muted" aria-hidden="true">
          <ChevronDown size={15} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </Pressable>
      {open && (
        <div id={panelId} className="space-y-3 px-4 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}
