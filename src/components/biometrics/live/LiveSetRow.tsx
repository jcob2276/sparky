import { useState } from 'react';
import { Check, Trophy } from 'lucide-react';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import type { WorkoutSet } from '../workout/workoutUtils';
import { MAX_KG, MAX_REPS, normalizeNumber, type SetGhost } from './liveWorkoutUtils';

interface Props {
  set: WorkoutSet;
  number: number;
  ghost: SetGhost | null;
  /** Pierwsza niezaliczona seria — dostaje szybkie przyciski ± (podobnie każda seria, którą akurat edytujesz). */
  isNext: boolean;
  weightStep: number;
  isPr: boolean;
  actionsOpen: boolean;
  /** Krótka podpowiedź po próbie zaliczenia serii bez powtórzeń. */
  needsReps: boolean;
  onChange: (patch: Partial<WorkoutSet>) => void;
  onToggleDone: () => void;
  onToggleActions: () => void;
}

const numeric = (integer: boolean) => (integer ? /^\d*$/ : /^\d*(?:\.\d*)?$/);

function Field({
  label,
  value,
  placeholder,
  integer,
  done,
  invalid,
  onChange,
  onFocusChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  integer: boolean;
  done: boolean;
  invalid: boolean;
  onChange: (next: string) => void;
  onFocusChange: (focused: boolean) => void;
}) {
  const max = integer ? MAX_REPS : MAX_KG;
  const border = invalid ? 'border-danger' : done ? 'border-transparent' : 'border-border-custom';
  return (
    <ControlInput
      aria-label={label}
      aria-invalid={invalid}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      enterKeyHint="done"
      autoComplete="off"
      value={value}
      placeholder={placeholder || '—'}
      onFocus={(event) => {
        event.currentTarget.select();
        onFocusChange(true);
      }}
      onBlur={() => {
        onFocusChange(false);
        const cleaned = normalizeNumber(value, max, integer);
        if (cleaned !== value) onChange(cleaned);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
      onChange={(event) => {
        const next = event.target.value.replace(',', '.');
        if (!numeric(integer).test(next)) return;
        const parsed = Number(next);
        onChange(Number.isFinite(parsed) && parsed > max ? String(max) : next);
      }}
      className={`h-12 w-full min-w-0 rounded-xl border text-center text-lg font-bold tabular-nums text-text-primary outline-none transition-colors placeholder:font-semibold placeholder:text-text-muted/55 focus:border-primary ${border} ${
        done ? 'bg-transparent' : 'bg-surface-2'
      }`}
    />
  );
}

function StepButtons({ label, step, base, max, onChange }: { label: string; step: number; base: number; max: number; onChange: (next: string) => void }) {
  const apply = (delta: number) => onChange(String(Math.min(max, Math.max(0, Math.round((base + delta) * 100) / 100))));
  const chip = 'h-9 flex-1 rounded-lg border border-border-custom bg-surface-1 text-xs font-bold tabular-nums text-text-secondary active:bg-primary/10 disabled:opacity-40';
  const text = String(step).replace('.', ',');
  return (
    <div className="flex gap-1.5" role="group" aria-label={label}>
      <Pressable onPointerDown={(e) => e.preventDefault()} onClick={() => apply(-step)} disabled={base <= 0} className={chip} aria-label={`${label} minus ${text}`}>−{text}</Pressable>
      <Pressable onPointerDown={(e) => e.preventDefault()} onClick={() => apply(step)} disabled={base >= max} className={chip} aria-label={`${label} plus ${text}`}>+{text}</Pressable>
    </div>
  );
}

/** Jedna seria: numer (otwiera akcje), kg, powtórzenia, ptaszek. Poprzednie wartości są podpowiedzią, ptaszek je zatwierdza. */
export default function LiveSetRow({ set, number, ghost, isNext, weightStep, isPr, actionsOpen, needsReps, onChange, onToggleDone, onToggleActions }: Props) {
  const [focused, setFocused] = useState(false);
  const done = Boolean(set.done);
  const isWarmup = set.type === 'warmup';
  const kgBase = parseFloat(set.kg) || parseFloat(ghost?.kg ?? '') || 0;
  const repsBase = parseInt(set.reps, 10) || parseInt(ghost?.reps ?? '', 10) || 0;
  const showSteppers = (isNext || focused) && !done;

  return (
    <div className={`rounded-2xl px-1.5 py-1.5 transition-colors ${done ? 'bg-primary/10' : ''}`}>
      <div className="grid grid-cols-[2.25rem_1fr_1fr_2.75rem] items-center gap-2">
        <Pressable
          onClick={onToggleActions}
          aria-expanded={actionsOpen}
          aria-label={`${isWarmup ? 'Rozgrzewka' : `Seria ${number}`}, opcje`}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
            isWarmup ? 'bg-warning/15 text-warning' : actionsOpen ? 'bg-primary text-on-accent' : 'bg-surface-2 text-text-secondary'
          }`}
        >
          {isWarmup ? 'R' : number}
        </Pressable>
        <Field label={`Ciężar kg, seria ${number}`} value={set.kg} placeholder={ghost?.kg ?? ''} integer={false} done={done} invalid={false} onChange={(kg) => onChange({ kg })} onFocusChange={setFocused} />
        <Field label={`Powtórzenia, seria ${number}`} value={set.reps} placeholder={ghost?.reps ?? ''} integer done={done} invalid={needsReps} onChange={(reps) => onChange({ reps })} onFocusChange={setFocused} />
        <Pressable
          type="button"
          onClick={onToggleDone}
          aria-pressed={done}
          aria-label={done ? `Cofnij serię ${number}` : `Zalicz serię ${number}`}
          className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
            done ? 'border-primary bg-primary text-on-accent' : 'border-border-custom bg-surface-1 text-text-muted'
          }`}
        >
          <Check size={20} strokeWidth={3} />
        </Pressable>
      </div>
      {needsReps && !done && <p role="alert" className="mt-1 px-1 text-center text-xs font-semibold text-danger">Wpisz powtórzenia, żeby zaliczyć serię.</p>}
      {showSteppers && (
        <div className="mt-1.5 grid grid-cols-[2.25rem_1fr_1fr_2.75rem] gap-2">
          <span />
          <StepButtons label="Ciężar" step={weightStep} base={kgBase} max={MAX_KG} onChange={(kg) => onChange({ kg })} />
          <StepButtons label="Powtórzenia" step={1} base={repsBase} max={MAX_REPS} onChange={(reps) => onChange({ reps })} />
          <span />
        </div>
      )}
      {isPr && done && (
        <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-warning">
          <Trophy size={13} /> Nowy rekord (szacowane 1RM)
        </p>
      )}
    </div>
  );
}
