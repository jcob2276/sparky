import { CalendarCheck, MessageCircle, PhoneCall, Handshake } from 'lucide-react';
import type { ReactNode } from 'react';
import { sanitizeCountInput, type DayNumbersDraft } from '../../../lib/closer/closerDayModel';
import { ControlInput, ControlTextarea } from '../../ui/ControlPrimitives';

interface SalesNumbersFieldsProps {
  idPrefix: string;
  draft: DayNumbersDraft;
  onChange: (patch: Partial<DayNumbersDraft>) => void;
  disabled?: boolean;
}

type CountKey = 'conversations' | 'appointments' | 'salesCalls' | 'salesClosed';

interface CountField {
  key: CountKey;
  label: string;
  icon: ReactNode;
}

/** Kolejność lejka: najpierw rozmowy odebrane i umówienia z nich, niżej rozmowy sprzedażowe i sprzedaże. */
const DIAL_FIELDS: CountField[] = [
  { key: 'conversations', label: 'Rozmowy odebrane', icon: <PhoneCall size={13} className="text-primary" /> },
  { key: 'appointments', label: 'Umówieni', icon: <CalendarCheck size={13} className="text-success" /> },
];
const SALES_FIELDS: CountField[] = [
  { key: 'salesCalls', label: 'Rozmowy sprzedażowe', icon: <MessageCircle size={13} className="text-info" /> },
  { key: 'salesClosed', label: 'Sprzedaże', icon: <Handshake size={13} className="text-warning" /> },
];

/** Cztery liczby dnia (rozmowy odebrane → umówieni, rozmowy sprzedażowe → sprzedaże) i jedno zdanie opinii. Puste pole to „jeszcze nie wpisane”, 0 jest poprawną wartością. */
export default function SalesNumbersFields({ idPrefix, draft, onChange, disabled = false }: SalesNumbersFieldsProps) {
  const locked = disabled || draft.off;
  const renderRow = (fields: CountField[]) => (
    <div className="grid grid-cols-2 gap-2">
      {fields.map(({ key, label, icon }) => (
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
            className="w-full bg-surface-2 border border-border-custom/60 rounded-xl px-3 py-2.5 text-lg font-semibold text-text-primary text-center tabular-nums"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {renderRow(DIAL_FIELDS)}
      {renderRow(SALES_FIELDS)}

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
