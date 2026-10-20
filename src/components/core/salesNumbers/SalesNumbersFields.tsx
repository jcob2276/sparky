import { CalendarCheck, MessageCircle, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { sanitizeCountInput, type DayNumbersDraft } from '../../../lib/closer/closerDayModel';
import { ControlInput, ControlTextarea } from '../../ui/ControlPrimitives';

interface SalesNumbersFieldsProps {
  idPrefix: string;
  draft: DayNumbersDraft;
  onChange: (patch: Partial<DayNumbersDraft>) => void;
  disabled?: boolean;
}

type CountKey = 'appointments' | 'conversations' | 'salesCalls';

const COUNT_FIELDS: Array<{ key: CountKey; label: string; icon: ReactNode }> = [
  { key: 'appointments', label: 'Umówieni', icon: <CalendarCheck size={13} className="text-success" /> },
  { key: 'conversations', label: 'Rozmowy', icon: <MessageCircle size={13} className="text-info" /> },
  { key: 'salesCalls', label: 'Sales calle', icon: <UserCheck size={13} className="text-primary" /> },
];

/** Trzy liczby dnia i jedno zdanie opinii. Puste pole to „jeszcze nie wpisane”, 0 jest poprawną wartością. */
export default function SalesNumbersFields({ idPrefix, draft, onChange, disabled = false }: SalesNumbersFieldsProps) {
  const locked = disabled || draft.off;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {COUNT_FIELDS.map(({ key, label, icon }) => (
          <div key={key} className="space-y-1">
            <label htmlFor={`${idPrefix}-${key}`} className="flex items-center gap-1 text-xs font-bold text-text-secondary">
              {icon} {label}
            </label>
            <ControlInput
              id={`${idPrefix}-${key}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={draft.off ? '0' : draft[key]}
              disabled={locked}
              onChange={(event) => onChange({ [key]: sanitizeCountInput(event.target.value) })}
              className="w-full bg-surface-2 border border-border-custom/60 rounded-xl px-3 py-2.5 text-lg font-black text-text-primary text-center tabular-nums"
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2.5 text-xs font-semibold text-text-secondary cursor-pointer">
        <ControlInput
          type="checkbox"
          checked={draft.off}
          disabled={disabled}
          onChange={(event) => onChange({ off: event.target.checked })}
          className="size-4 accent-primary"
        />
        Dziś bez sprzedaży (same zera)
      </label>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-note`} className="text-xs font-bold text-text-secondary block">
          Jedno zdanie o tych liczbach
        </label>
        <ControlTextarea
          id={`${idPrefix}-note`}
          value={draft.note}
          disabled={disabled}
          onChange={(event) => onChange({ note: event.target.value })}
          placeholder="Np. dużo odmów rano, po obiedzie lepiej…"
          rows={2}
          className="w-full bg-surface-2 border border-border-custom/60 rounded-xl px-3 py-2 text-sm font-semibold text-text-primary resize-none"
        />
      </div>
    </div>
  );
}
