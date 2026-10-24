import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import Sheet from '../../ui/Sheet';
import { Pressable } from '../../ui/ControlPrimitives';
import { GENERAL_TIP, MEASURE_GUIDES, type MeasureKey } from '../../../lib/health/measureGuides';
import MeasureDiagram from './MeasureDiagram';

/** Mały znak „?” przy polu pomiaru: otwiera arkusz z rysunkiem i opisem, gdzie dokładnie mierzyć. */
export default function MeasureHelp({ measure }: { measure: MeasureKey }) {
  const [open, setOpen] = useState(false);
  const guide = MEASURE_GUIDES[measure];
  return (
    <>
      <Pressable
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Jak mierzyć: ${guide.label}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-text-muted hover:text-primary cursor-pointer"
      >
        <HelpCircle size={14} />
      </Pressable>
      <Sheet open={open} onOpenChange={setOpen} title={`Jak mierzyć: ${guide.label}`} side="bottom" compact>
        <div className="space-y-4 pb-4">
          {guide.mark && <MeasureDiagram guide={guide} />}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-primary">{guide.where}</p>
            <p className="text-sm text-text-secondary">{guide.tip}</p>
          </div>
          <p className="rounded-xl border border-border-custom bg-surface/60 p-3 text-xs text-text-muted">{GENERAL_TIP}</p>
        </div>
      </Sheet>
    </>
  );
}
