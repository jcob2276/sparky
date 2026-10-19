import { Check, Trophy } from 'lucide-react';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import type { WorkoutSet } from '../workout/workoutUtils';
import type { SetGhost } from './liveWorkoutUtils';

interface Props {
  set: WorkoutSet;
  number: number;
  ghost: SetGhost | null;
  /** Pierwsza niezaliczona seria — dostaje szybkie przyciski ±. */
  isNext: boolean;
  weightStep: number;
  isPr: boolean;
  onChange: (patch: Partial<WorkoutSet>) => void;
  onToggleDone: () => void;
}

const numeric = (integer: boolean) => (integer ? /^\d*$/ : /^\d*(?:\.\d*)?$/);

function Field({
  label,
  value,
  placeholder,
  integer,
  done,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  integer: boolean;
  done: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <ControlInput
      aria-label={label}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      enterKeyHint="done"
      autoComplete="off"
      value={value}
      placeholder={placeholder || '—'}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const next = event.target.value.replace(',', '.');
        if (numeric(integer).test(next)) onChange(next);
      }}
      className={`h-12 w-full min-w-0 rounded-xl border text-center text-lg font-bold tabular-nums outline-none transition-colors placeholder:font-semibold placeholder:text-text-muted/55 focus:border-primary ${
        done ? 'border-transparent bg-transparent text-text-primary' : 'border-border-custom bg-surface-2 text-text-primary'
      }`}
    />
  );
}

function StepButtons({ label, step, base, onChange }: { label: string; step: number; base: number; onChange: (next: string) => void }) {
  const apply = (delta: number) => onChange(String(Math.max(0, Math.round((base + delta) * 100) / 100)));
  const chip = 'h-9 flex-1 rounded-lg border border-border-custom bg-surface-1 text-xs font-bold tabular-nums text-text-secondary active:bg-primary/10';
  const text = (n: number) => String(n).replace('.', ',');
  return (
    <div className="flex gap-1.5" role="group" aria-label={label}>
      <Pressable onPointerDown={(e) => e.preventDefault()} onClick={() => apply(-step)} className={chip} aria-label={`${label} minus ${text(step)}`}>−{text(step)}</Pressable>
      <Pressable onPointerDown={(e) => e.preventDefault()} onClick={() => apply(step)} className={chip} aria-label={`${label} plus ${text(step)}`}>+{text(step)}</Pressable>
    </div>
  );
}

/** Jedna seria: numer, kg, powtórzenia, ptaszek. Poprzednie wartości są podpowiedzią, ptaszek je zatwierdza. */
export default function LiveSetRow({ set, number, ghost, isNext, weightStep, isPr, onChange, onToggleDone }: Props) {
  const done = Boolean(set.done);
  const isWarmup = set.type === 'warmup';
  const kgBase = parseFloat(set.kg) || parseFloat(ghost?.kg ?? '') || 0;
  const repsBase = parseInt(set.reps, 10) || parseInt(ghost?.reps ?? '', 10) || 0;

  return (
    <div className={`rounded-2xl px-1.5 py-1.5 transition-colors ${done ? 'bg-primary/10' : ''}`}>
      <div className="grid grid-cols-[2.25rem_1fr_1fr_2.75rem] items-center gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
            isWarmup ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text-secondary'
          }`}
          aria-label={isWarmup ? 'Seria rozgrzewkowa' : `Seria ${number}`}
        >
          {isWarmup ? 'R' : number}
        </span>
        <Field label={`Ciężar kg, seria ${number}`} value={set.kg} placeholder={ghost?.kg ?? ''} integer={false} done={done} onChange={(kg) => onChange({ kg })} />
        <Field label={`Powtórzenia, seria ${number}`} value={set.reps} placeholder={ghost?.reps ?? ''} integer done={done} onChange={(reps) => onChange({ reps })} />
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
      {isNext && !done && (
        <div className="mt-1.5 grid grid-cols-[2.25rem_1fr_1fr_2.75rem] gap-2">
          <span />
          <StepButtons label="Ciężar" step={weightStep} base={kgBase} onChange={(kg) => onChange({ kg })} />
          <StepButtons label="Powtórzenia" step={1} base={repsBase} onChange={(reps) => onChange({ reps })} />
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
