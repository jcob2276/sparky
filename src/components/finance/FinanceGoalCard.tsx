import { useState } from 'react';
import { Target } from 'lucide-react';
import { formatMonths, formatPln } from '../../lib/finance/formatMoney';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import type { FinanceMetrics } from './useFinanceMetrics';

interface FinanceGoalCardProps {
  metrics: FinanceMetrics;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSaveTarget: (target: number) => void;
}

function GoalEditor({ initial, onSave, onClose }: { initial: number; onSave: (target: number) => void; onClose: () => void }) {
  const [value, setValue] = useState(String(initial));
  const parsed = Number(value.replace(',', '.'));
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (parsed > 0) onSave(parsed);
        onClose();
      }}
    >
      <ControlInput
        autoFocus
        type="number"
        inputMode="decimal"
        min="1"
        aria-label="Cel majątku netto"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-11 w-40 rounded-full border-0 bg-surface-2 px-4 text-base tabular-nums ring-1 ring-border-custom/30"
      />
      <Pressable type="submit" disabled={!(parsed > 0)} className="min-h-11 rounded-full bg-text-primary px-5 text-sm font-semibold text-background disabled:opacity-[var(--opacity-disabled)]">
        Zapisz cel
      </Pressable>
    </form>
  );
}

function goalLine(metrics: FinanceMetrics): string {
  const { goal, monthlySaving } = metrics;
  if (goal.reached) return 'Cel osiągnięty.';
  if (goal.monthsToGoal == null) {
    return monthlySaving > 0
      ? 'Przy obecnym tempie cel jest poza horyzontem 50 lat.'
      : 'Ustaw dochód i wydatki w Przepływach, żeby policzyć czas do celu.';
  }
  return `Przy odkładaniu ${formatPln(monthlySaving)}/mies. i ${metrics.fireInput.expectedReturnPct}% rocznie: około ${formatMonths(goal.monthsToGoal).replace(/\.$/, '')}.`;
}

export function FinanceGoalCard({ metrics, editing, onEditingChange, onSaveTarget }: FinanceGoalCardProps) {
  const { goal } = metrics;

  return (
    <section className="space-y-3 p-5" aria-label="Cel majątku">
      <div className="flex items-center justify-between gap-3">
        <Pressable
          type="button"
          onClick={() => onEditingChange(!editing)}
          className="flex items-center gap-2 text-base font-semibold"
          aria-label="Zmień cel majątku netto"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Target size={16} aria-hidden="true" />
          </span>
          Cel {formatPln(metrics.netWorthTarget)}
        </Pressable>
        <span className="text-base font-semibold tabular-nums">{goal.progressPct.toFixed(1).replace('.', ',')}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(goal.progressPct)}
        aria-label="Postęp do celu"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-slow)]" style={{ width: `${goal.progressPct}%` }} />
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">
        {goal.reached ? 'Cel osiągnięty.' : `Zostało ${formatPln(goal.remaining)}. ${goalLine(metrics)}`}
      </p>
      {editing && <GoalEditor initial={metrics.netWorthTarget} onSave={onSaveTarget} onClose={() => onEditingChange(false)} />}
    </section>
  );
}
