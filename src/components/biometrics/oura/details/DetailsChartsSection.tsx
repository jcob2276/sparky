import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from '../../../ui/Button';
import { OuraSectionHeader } from '../shared/OuraSectionHeader';
import { HealthChartsContainer } from '../../health/HealthChartsContainer';
import { DetailsHealthspanReadOnly } from './DetailsHealthspanReadOnly';

function Collapsible({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/5 bg-surface-1">
      <Button
        variant="ghost"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="!flex !min-h-12 !w-full !justify-between !gap-3 !rounded-xl !px-4 !text-left !text-base !font-normal !text-text-primary"
      >
        {title}
        <ChevronDown size={18} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </Button>
      {/* Treść montowana dopiero po otwarciu — zapytania nie biegną dla zwiniętych sekcji. */}
      <div id={id} hidden={!open} className="p-4 pt-0">{open && children}</div>
    </div>
  );
}

/** Wykresy: własne wykresy zdrowia i Healthspan (tylko odczyt), domyślnie zwinięte. */
export function DetailsChartsSection({ userId }: { userId?: string }) {
  return (
    <section id="charts" data-anchor="charts" className="scroll-mt-20 space-y-4" aria-labelledby="details-charts-title">
      <OuraSectionHeader id="details-charts-title" title="Wykresy" subtitle="Dowolna metryka w czasie oraz wiek funkcjonalny." />
      <div className="space-y-3">
        {userId && (
          <Collapsible id="details-own-charts" title="Własne wykresy zdrowia">
            <HealthChartsContainer userId={userId} />
          </Collapsible>
        )}
        <Collapsible id="details-healthspan" title="Healthspan">
          <DetailsHealthspanReadOnly />
        </Collapsible>
      </div>
    </section>
  );
}
