import { useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';

interface WorkoutNumberInputProps {
  label: string;
  unit?: string;
  actionLabel: string;
  series: number;
  value: string;
  placeholder?: string;
  step: number;
  max?: number;
  integer?: boolean;
  inputClassName?: string;
  onChange: (value: string) => void;
}

/** Direct entry remains optional: steppers never focus the input or summon a keyboard. */
export function WorkoutNumberInput({ label, unit, actionLabel, series, value, placeholder, step, max,
  integer = false, inputClassName = '', onChange }: WorkoutNumberInputProps) {
  const id = useId();
  const clamp = (number: number) => Math.min(max ?? Infinity, Math.max(0, number));
  const adjust = (direction: number) => {
    const base = parseFloat(value || placeholder || '0');
    onChange(String(clamp(Math.round(((Number.isFinite(base) ? base : 0) + direction * step) * 100) / 100)));
  };

  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-text-secondary text-center">{label}{unit && ` (${unit})`}</label>
      <ControlInput
        id={id}
        aria-label={`${label}, seria ${series}`}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        enterKeyHint="done"
        autoComplete="off"
        value={value}
        placeholder={placeholder || '—'}
        onFocus={event => event.currentTarget.select()}
        onChange={event => {
          const next = event.target.value.replace(',', '.');
          if ((integer ? /^\d*$/ : /^\d*(?:\.\d*)?$/).test(next)) onChange(next);
        }}
        onBlur={() => {
          const number = Number(value);
          if (value.trim() && Number.isFinite(number)) onChange(String(clamp(number)));
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        className={`h-12 w-full min-w-0 rounded-xl border border-border-custom bg-surface-solid text-center text-lg font-bold tabular-nums text-text-primary focus:border-primary placeholder:text-text-secondary ${inputClassName}`}
      />
      <div className="grid grid-cols-2 gap-1">
        <Pressable
          aria-label={`Zmniejsz ${actionLabel}, seria ${series}`}
          onPointerDown={event => event.preventDefault()}
          onClick={() => adjust(-1)}
          className="flex h-11 items-center justify-center rounded-lg border border-border-custom bg-surface-2 text-text-primary hover:bg-surface-3"
        ><Minus size={18} /></Pressable>
        <Pressable
          aria-label={`Zwiększ ${actionLabel}, seria ${series}`}
          onPointerDown={event => event.preventDefault()}
          onClick={() => adjust(1)}
          className="flex h-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20"
        ><Plus size={18} /></Pressable>
      </div>
    </div>
  );
}
