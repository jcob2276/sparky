import { Pressable } from '../ui/ControlPrimitives';

const OPTIONS = [
  { value: 'urgent', short: 'P1', label: 'Pilny', tone: 'bg-danger/15 text-danger' },
  { value: 'high', short: 'P2', label: 'Wysoki', tone: 'bg-warning/15 text-warning' },
  { value: 'normal', short: 'P3', label: 'Normalny', tone: 'bg-primary/15 text-primary' },
  { value: 'low', short: 'P4', label: 'Niski', tone: 'bg-surface-2 text-text-secondary' },
] as const;

/** Zwarty wybór priorytetu zamiast natywnej listy. */
export default function TodoPriorityChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Priorytet" className="flex gap-1.5">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={active}
            aria-label={`${option.short} · ${option.label}`}
            onClick={() => onChange(option.value)}
            className={`min-h-11 min-w-12 rounded-lg px-3 text-xs font-bold ${active ? `${option.tone} ring-2 ring-current` : 'bg-surface-2 text-text-muted'}`}
          >
            {option.short}
          </Pressable>
        );
      })}
    </div>
  );
}
