import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Target } from 'lucide-react';
import type { FinanceSnapshot } from '../../lib/financeApi';
import { formatMonths, formatPln } from '../../lib/finance/formatMoney';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import type { FinanceMetrics } from './useFinanceMetrics';

interface FinanceNetWorthHeroProps {
  metrics: FinanceMetrics;
  snapshots: FinanceSnapshot[];
  onSaveTarget: (target: number) => void;
  onOpenQuickEntry: () => void;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 100},${28 - ((value - min) / span) * 24}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full text-background/60" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
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
        type="number"
        inputMode="decimal"
        min="1"
        aria-label="Cel majątku netto"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-11 w-40 rounded-full border-0 bg-background/10 px-4 text-base tabular-nums text-background ring-1 ring-background/20"
      />
      <Pressable type="submit" disabled={!(parsed > 0)} className="min-h-11 rounded-full bg-background px-4 text-sm font-semibold text-text-primary disabled:opacity-[var(--opacity-disabled)]">
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
  return `Zostało ${formatPln(goal.remaining)}. Przy odkładaniu ${formatPln(monthlySaving)}/mies. i ${metrics.fireInput.expectedReturnPct}% rocznie: około ${formatMonths(goal.monthsToGoal)}.`;
}

function FlowTile({ label, amount, tone }: { label: string; amount: number; tone: 'in' | 'out' }) {
  const Icon = tone === 'in' ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-background/10 px-3 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'in' ? 'bg-success/25 text-success' : 'bg-danger/25 text-danger'}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-background/70">{label}</p>
        <p className="truncate text-base font-semibold tabular-nums">{formatPln(amount)}</p>
      </div>
    </div>
  );
}

export function FinanceNetWorthHero({ metrics, snapshots, onSaveTarget, onOpenQuickEntry }: FinanceNetWorthHeroProps) {
  const [editing, setEditing] = useState(false);
  const history = snapshots.map((item) => item.net_worth);
  const { goal } = metrics;

  return (
    <section className="space-y-4 rounded-[28px] bg-text-primary p-5 text-background" aria-label="Majątek netto">
      <div className="space-y-1">
        <p className="text-sm text-background/70">Majątek netto</p>
        <p className="text-[length:var(--finance-display-size)] font-semibold tabular-nums leading-[var(--line-height-display)] tracking-[var(--tracking-display)]">
          {formatPln(metrics.netWorth)}
        </p>
        <Sparkline values={history} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <Pressable
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="flex items-center gap-1.5 font-medium"
            aria-label="Zmień cel majątku netto"
          >
            <Target size={15} aria-hidden="true" />
            Cel {formatPln(metrics.netWorthTarget)}
          </Pressable>
          <span className="tabular-nums text-background/70">{goal.progressPct.toFixed(1).replace('.', ',')}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-background/20"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(goal.progressPct)}
          aria-label="Postęp do celu"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-slow)]" style={{ width: `${goal.progressPct}%` }} />
        </div>
        <p className="text-sm leading-relaxed text-background/70">{goalLine(metrics)}</p>
        {editing && <GoalEditor initial={metrics.netWorthTarget} onSave={onSaveTarget} onClose={() => setEditing(false)} />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FlowTile label="Wpływy w miesiącu" amount={metrics.earnedThisMonth} tone="in" />
        <FlowTile label="Wydatki w miesiącu" amount={metrics.spentThisMonth} tone="out" />
      </div>

      <Pressable
        type="button"
        onClick={onOpenQuickEntry}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-background text-base font-semibold text-text-primary transition-transform duration-[var(--motion-instant)] active:scale-[var(--scale-pressed)]"
      >
        <Plus size={20} aria-hidden="true" />
        Szybki wpis
      </Pressable>
    </section>
  );
}
