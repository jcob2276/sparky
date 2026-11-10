import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  SLIDE_LIMITS, draftFromSlide, isDraftSavable, type RealitySlide, type SlideDraft,
} from '../../../lib/realitySlide';
import Button from '../../ui/Button';
import { ControlTextarea } from '../../ui/ControlPrimitives';
import Input from '../../ui/Input';
import Sheet from '../../ui/Sheet';

interface RealitySlideSheetProps {
  open: boolean;
  slide: RealitySlide | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: SlideDraft) => void;
}

function Form({ slide, saving, onSave }: Pick<RealitySlideSheetProps, 'slide' | 'saving' | 'onSave'>) {
  const [draft, setDraft] = useState<SlideDraft>(() => draftFromSlide(slide));
  const setStep = (index: number, value: string) =>
    setDraft(d => ({ ...d, steps: d.steps.map((s, i) => (i === index ? value : s)) }));
  return (
    <form className="space-y-4 pb-2" onSubmit={e => { e.preventDefault(); onSave(draft); }}>
      <Input label="Wariant, który wybieram" value={draft.title} maxLength={SLIDE_LIMITS.title}
        placeholder="Np. Zdrowy, spokojny, z własnym biznesem"
        onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
      <div>
        <label htmlFor="slide-statement" className="mb-1 block text-xs font-semibold text-text-secondary">Jak w nim żyję</label>
        <ControlTextarea id="slide-statement" rows={4} value={draft.statement} maxLength={SLIDE_LIMITS.statement}
          onChange={e => setDraft(d => ({ ...d, statement: e.target.value }))} className="w-full p-3" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-secondary">Kroki procesu (czynności, które mogę wykonać)</p>
        {draft.steps.map((step, i) => (
          <Input key={i} aria-label={`Krok ${i + 1}`} value={step} placeholder="Np. praca bez telefonu"
            onChange={e => setStep(i, e.target.value)} />
        ))}
        {draft.steps.length < SLIDE_LIMITS.steps && (
          <Button type="button" variant="tonal" className="min-h-11" onClick={() => setDraft(d => ({ ...d, steps: [...d.steps, ''] }))}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />Dodaj krok
          </Button>
        )}
      </div>
      <Button type="submit" className="min-h-11 w-full" disabled={!isDraftSavable(draft) || saving}>
        {saving ? 'Zapisuję…' : 'Zapisz slajd'}
      </Button>
    </form>
  );
}

export function RealitySlideSheet({ open, slide, saving, onClose, onSave }: RealitySlideSheetProps) {
  return (
    <Sheet open={open} onOpenChange={next => { if (!next) onClose(); }} title="Slajd" side="bottom">
      <Form key={slide?.id ?? 'new'} slide={slide} saving={saving} onSave={onSave} />
    </Sheet>
  );
}
