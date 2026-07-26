import { Plus, X } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import type { TodoSlot } from './types';
import { PRIORITY_COLORS } from './useMorningPlanData';

interface Props {
  powerList: (TodoSlot | null)[];
  suggestions: TodoSlot[];
  dayWord: string;
  onEditSlot: (index: number, title: string) => void;
  onAssign: (index: number, task: TodoSlot) => void;
  onClear: (index: number) => void;
}

const SLOT_META = [
  { label: 'Ciało', badge: 'text-success bg-success/15 border-success/30', placeholder: 'Ciało (trening, sen, zdrowie…)' },
  { label: 'Duch', badge: 'text-primary bg-primary/15 border-primary/30', placeholder: 'Duch (rozwój, dyscyplina, umysł…)' },
  { label: 'Konto', badge: 'text-warning bg-warning/15 border-warning/30', placeholder: 'Konto (finanse, praca, dowożenie…)' },
  { label: 'Ruch 4', badge: 'text-text-muted bg-surface-2 border-border-custom/40', placeholder: 'Wpisz własne działanie…' },
  { label: 'Ruch 5', badge: 'text-text-muted bg-surface-2 border-border-custom/40', placeholder: 'Wpisz własne działanie…' },
];

export default function MorningPlanStep2PowerList({
  powerList,
  suggestions,
  dayWord,
  onEditSlot,
  onAssign,
  onClear,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-black text-text-primary">Co chcesz zrobić {dayWord}?</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Wpisz własny plan. Zadania z Todo poniżej są tylko sugestiami.
        </p>
      </div>

      <div className="space-y-2">
        {powerList.map((slot, index) => {
          const meta = SLOT_META[index] ?? SLOT_META[3];
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="size-6 rounded-full bg-border-custom/30 flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                {index + 1}
              </span>
              <span className={`px-2 py-1 rounded-lg text-2xs font-black uppercase tracking-wider border shrink-0 min-w-14 text-center ${meta.badge}`}>
                {meta.label}
              </span>
              <ControlInput
                value={slot?.title ?? ''}
                onChange={(event) => onEditSlot(index, event.target.value)}
                placeholder={meta.placeholder}
                aria-label={`${meta.label} - Działanie ${index + 1}`}
                className="flex-1 rounded-xl border border-border-custom/60 bg-surface px-3 py-2.5 text-sm font-semibold text-text-primary"
              />
              {slot && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClear(index)}
                  icon={<X size={14} />}
                  aria-label={`Wyczyść działanie ${index + 1}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <details className="rounded-2xl border border-border-custom/40 bg-surface-2 p-3">
        <summary className="cursor-pointer text-xs font-bold text-text-secondary">
          Sugestie z Todo ({suggestions.length})
        </summary>
        <div className="space-y-1.5 mt-3">
          {suggestions.length === 0 ? (
            <p className="text-xs text-text-muted">Brak otwartych sugestii.</p>
          ) : (
            suggestions.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <span className={`text-2xs font-black ${PRIORITY_COLORS[task.priority] || 'text-text-muted'}`}>
                  {task.priority === 'urgent' ? '!!' : task.priority === 'high' ? '!' : '·'}
                </span>
                <span className="text-sm font-semibold text-text-primary flex-1 truncate">{task.title}</span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus size={13} />}
                  onClick={() => {
                    const emptyIndex = powerList.findIndex((slot) => !slot?.title.trim());
                    if (emptyIndex >= 0) onAssign(emptyIndex, task);
                  }}
                  disabled={powerList.every((slot) => Boolean(slot?.title.trim()))}
                >
                  Dodaj
                </Button>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
