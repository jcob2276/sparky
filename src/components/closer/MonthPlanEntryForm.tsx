import { useState } from 'react';
import { closeRate, LEARNING_TARGET_MIN, REFLECTION_MIN_CHARS, REFLECTION_TARGET_MIN, type DayActual } from '../../lib/closer/monthPlan';
import { canCloseDay, dayFromDraft, draftFromDay, validateDay, type EntryDraft, type NumericField } from '../../lib/closer/monthPlanEntry';
import Button from '../ui/Button';
import { ControlInput, ControlTextarea } from '../ui/ControlPrimitives';

interface MonthPlanEntryFormProps {
  date: string;
  minDate: string;
  maxDate: string;
  initial: DayActual | undefined;
  saving: boolean;
  /** Blokada zapisu do czasu wczytania zapisanych liczb, żeby ich nie nadpisać. */
  disabled: boolean;
  onDateChange: (date: string) => void;
  onSave: (date: string, day: DayActual) => void;
}

const fieldClass = 'min-h-11 w-full rounded-lg border-0 bg-surface-2/70 px-3 text-base tabular-nums ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35';

const NUMBERS: Array<{ key: NumericField; label: string }> = [
  { key: 'dials', label: 'Dials' },
  { key: 'appointments', label: 'Umówione' },
  { key: 'salesCalls', label: 'Sales calle' },
  { key: 'salesClosed', label: 'Sprzedaże' },
];
const MINUTES: Array<{ key: NumericField; label: string; hint?: string }> = [
  { key: 'workMinutes', label: 'Praca' },
  { key: 'reflectionMinutes', label: 'Self-refleksja', hint: `cel ${REFLECTION_TARGET_MIN}` },
  { key: 'learningMinutes', label: 'Nauka', hint: `cel ${LEARNING_TARGET_MIN}` },
];

function NumberField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-muted">
      <span>{label}{hint && <span className="text-text-tertiary"> · {hint}</span>}</span>
      <ControlInput type="number" inputMode="numeric" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
    </label>
  );
}

/** Wpis jednego dnia: liczby sprzedaży, czas (min), refleksja. `key` w rodzicu odświeża pola po zmianie dnia albo zapisu. */
export function MonthPlanEntryForm({ date, minDate, maxDate, initial, saving, disabled, onDateChange, onSave }: MonthPlanEntryFormProps) {
  const [draft, setDraft] = useState<EntryDraft>(() => draftFromDay(initial));
  const set = (key: keyof EntryDraft) => (value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
  const day = dayFromDraft(draft);
  const error = validateDay(day);
  const closing = canCloseDay(day);
  const rate = closeRate(day.salesClosed, day.salesCalls);
  const chars = day.reflection.trim().length;

  return (
    <form
      className="space-y-4 rounded-lg bg-surface-1/70 p-4 ring-1 ring-border-custom/25"
      onSubmit={(event) => {
        event.preventDefault();
        if (!error) onSave(date, day);
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Dzień
          <ControlInput type="date" value={date} min={minDate} max={maxDate} onChange={(e) => e.target.value && onDateChange(e.target.value)} className={`${fieldClass} w-40`} />
        </label>
        <p className="pb-2 text-sm tabular-nums text-text-muted">close rate dnia {rate === null ? '—' : `${Math.round(rate * 100)}%`}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-primary">Liczby</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NUMBERS.map(({ key, label }) => <NumberField key={key} label={label} value={draft[key]} onChange={set(key)} />)}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-primary">Czas w minutach</legend>
        <div className="grid grid-cols-3 gap-3">
          {MINUTES.map(({ key, label, hint }) => <NumberField key={key} label={label} hint={hint} value={draft[key]} onChange={set(key)} />)}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-primary">Refleksja dnia <span className="font-normal text-warning">obowiązkowa</span></span>
        <ControlTextarea
          rows={4}
          maxLength={10000}
          value={draft.reflection}
          onChange={(e) => set('reflection')(e.target.value)}
          placeholder="Co zrobiłem dobrze? Co mnie zatrzymało? Jeden konkretny ruch na jutro."
          className="min-h-24 w-full rounded-lg border-0 bg-surface-2/70 px-3 py-2 text-base leading-relaxed ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35"
        />
        <span className={`text-xs tabular-nums ${closing ? 'text-success' : 'text-text-muted'}`}>
          {closing ? 'Refleksja wystarczy, żeby zamknąć dzień' : `min. ${REFLECTION_MIN_CHARS} znaków, żeby zamknąć dzień (${chars}/${REFLECTION_MIN_CHARS})`}
        </span>
      </label>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant={closing ? 'primary' : 'outline'} disabled={Boolean(error) || disabled} loading={saving} className="w-full rounded-lg">
        {closing ? 'Zamknij dzień' : 'Zapisz liczby bez zamykania dnia'}
      </Button>
    </form>
  );
}
