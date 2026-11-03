import { useState } from 'react';
import { closeRate, type DayActual } from '../../lib/closer/monthPlan';
import Button from '../ui/Button';
import { ControlInput } from '../ui/ControlPrimitives';

interface MonthPlanEntryFormProps {
  date: string;
  minDate: string;
  maxDate: string;
  initial: DayActual | undefined;
  saving: boolean;
  /** Blokada zapisu do czasu wczytania zapisanych liczb, żeby ich nie nadpisać. */
  disabled: boolean;
  onDateChange: (date: string) => void;
  onSave: (date: string, counts: DayActual) => void;
}

const fieldClass = 'min-h-11 w-full rounded-lg border-0 bg-surface-2/70 px-3 text-base tabular-nums ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35';
const FIELDS = [
  { key: 'appointments', label: 'Umówione' },
  { key: 'salesCalls', label: 'Sales calle' },
  { key: 'salesClosed', label: 'Sprzedaże' },
] as const;

function toCount(value: string): number {
  return value.trim() === '' ? 0 : Number(value);
}

/** Wpis jednego dnia. Pola startują od zapisanych liczb; `key` w rodzicu odświeża je po zmianie dnia albo zapisu. */
export function MonthPlanEntryForm({ date, minDate, maxDate, initial, saving, disabled, onDateChange, onSave }: MonthPlanEntryFormProps) {
  const [values, setValues] = useState({
    appointments: String(initial?.appointments ?? 0),
    salesCalls: String(initial?.salesCalls ?? 0),
    salesClosed: String(initial?.salesClosed ?? 0),
  });
  const counts: DayActual = {
    appointments: toCount(values.appointments),
    salesCalls: toCount(values.salesCalls),
    salesClosed: toCount(values.salesClosed),
  };
  const whole = Object.values(counts).every((n) => Number.isInteger(n) && n >= 0);
  const error = !whole
    ? 'Wpisz liczby całe, od zera w górę.'
    : counts.salesClosed > counts.salesCalls
      ? 'Sprzedaży nie może być więcej niż sales calli.'
      : null;
  const rate = closeRate(counts.salesClosed, counts.salesCalls);

  return (
    <form
      className="space-y-3 rounded-lg bg-surface-1/70 p-4 ring-1 ring-border-custom/25"
      onSubmit={(event) => {
        event.preventDefault();
        if (!error) onSave(date, counts);
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Dzień
          <ControlInput type="date" value={date} min={minDate} max={maxDate} onChange={(e) => e.target.value && onDateChange(e.target.value)} className={`${fieldClass} w-40`} />
        </label>
        <p className="pb-2 text-sm tabular-nums text-text-muted">
          close rate dnia {rate === null ? '—' : `${Math.round(rate * 100)}%`}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-text-muted">
            {label}
            <ControlInput
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={values[key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              className={fieldClass}
            />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={Boolean(error) || disabled} loading={saving} className="w-full rounded-lg">Zapisz dzień</Button>
    </form>
  );
}
