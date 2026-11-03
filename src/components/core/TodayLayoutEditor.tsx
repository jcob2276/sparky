import { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { parseTodayLayout, TODAY_SECTIONS, type TodayLayout } from '../../lib/todayLayout';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import { notify } from '../../lib/notify';

interface Props {
  layout: TodayLayout;
  saving: boolean;
  onSave: (value: TodayLayout) => Promise<unknown>;
  onClose: () => void;
}

/** Changes belong to this draft until the account write succeeds. */
export function TodayLayoutEditor({ layout, saving, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(() => parseTodayLayout(layout));
  const [error, setError] = useState<string | null>(null);
  const move = (index: number, offset: number) => {
    setDraft(current => {
      const sections = [...current.sections];
      const [section] = sections.splice(index, 1);
      sections.splice(index + offset, 0, section);
      return { ...current, sections };
    });
  };
  const save = async () => {
    setError(null);
    try { await onSave(draft); onClose(); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Nie udało się zapisać układu. Spróbuj ponownie.';
      setError(message);
      notify(message, 'error');
    }
  };
  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-[var(--z-raised)] flex flex-wrap justify-end gap-3 bg-surface-solid pb-3">
        <Button variant="secondary" className="min-h-11" disabled={saving} onClick={onClose}>Anuluj</Button>
        <Button aria-label="Zapisz układ" className="min-h-11" loading={saving} onClick={() => void save()}>Zapisz układ</Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <p className="text-sm leading-relaxed text-text-secondary">
        Ustaw kolejność sekcji i wybierz, które widzisz na Dziś. Zmiana widoku nie usuwa danych.
        Pilne terminy i przypomnienia pomiarów pozostają widoczne.
      </p>
      <ol className="divide-y divide-border-custom rounded-lg border border-border-custom bg-surface">
        {draft.sections.map((section, index) => {
          const label = TODAY_SECTIONS.find(item => item.id === section.id)!.label;
          return (
            <li key={section.id} aria-label={label} className="flex items-center gap-2 p-3">
              <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                {label}
                {!section.visible && <span className="mt-0.5 block text-xs font-normal text-text-muted">Ukryta</span>}
              </span>
              <IconButton label={`Przesuń ${label} w górę`} icon={<ArrowUp size={18} />}
                className="h-11 w-11 shrink-0" disabled={saving || index === 0} onClick={() => move(index, -1)} />
              <IconButton label={`Przesuń ${label} w dół`} icon={<ArrowDown size={18} />}
                className="h-11 w-11 shrink-0" disabled={saving || index === draft.sections.length - 1} onClick={() => move(index, 1)} />
              <IconButton label={`${section.visible ? 'Ukryj' : 'Pokaż'} ${label}`}
                icon={section.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                aria-pressed={section.visible} className="h-11 w-11 shrink-0" disabled={saving}
                onClick={() => setDraft(current => ({ ...current, sections: current.sections.map(item => (
                  item.id === section.id ? { ...item, visible: !item.visible } : item
                )) }))} />
            </li>
          );
        })}
      </ol>
      <Button variant="ghost" className="min-h-11" icon={<RotateCcw size={16} />} disabled={saving}
        onClick={() => setDraft(parseTodayLayout(null))}>Przywróć domyślny układ</Button>
    </div>
  );
}
