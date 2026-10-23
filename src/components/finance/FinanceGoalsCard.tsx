import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FinanceBundle } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { confirmDialog } from '../../lib/notify';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';

type Goal = FinanceBundle['goals'][number];

interface FinanceGoalsCardProps {
  goals: Goal[];
  onAdd: (input: { name: string; target_amount: number }) => void;
  onUpdate: (id: string, currentAmount: number) => void;
  onRemove: (id: string) => void;
}

const inputClass = 'min-h-11 rounded-full border-0 bg-surface-2 px-4 text-sm ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35';

function SavedInput({ goal, onSave }: { goal: Goal; onSave: (value: number) => void }) {
  const [value, setValue] = useState(String(goal.current_amount));
  const commit = () => {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== goal.current_amount) onSave(parsed);
    else setValue(String(goal.current_amount));
  };
  return (
    <ControlInput
      type="number"
      inputMode="decimal"
      min="0"
      aria-label={`Odłożone na ${goal.name}`}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      className={`${inputClass} w-28 shrink-0 text-right tabular-nums`}
    />
  );
}

function AddGoalForm({ onAdd }: { onAdd: FinanceGoalsCardProps['onAdd'] }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const value = Number(target.replace(',', '.'));
  const valid = name.trim().length > 0 && value > 0;
  return (
    <form
      className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onAdd({ name, target_amount: value });
        setName('');
        setTarget('');
      }}
    >
      <ControlInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nowy cel (np. Wakacje)" aria-label="Nazwa celu" className={`${inputClass} min-w-0`} />
      <ControlInput type="number" inputMode="decimal" min="1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Kwota" aria-label="Kwota celu" className={`${inputClass} min-w-0`} />
      <Pressable type="submit" disabled={!valid} aria-label="Dodaj cel" className="flex h-11 w-11 items-center justify-center rounded-full bg-text-primary text-background disabled:opacity-[var(--opacity-disabled)]">
        <Plus size={20} aria-hidden="true" />
      </Pressable>
    </form>
  );
}

export function FinanceGoalsCard({ goals, onAdd, onUpdate, onRemove }: FinanceGoalsCardProps) {
  const remove = async (goal: Goal) => {
    if (await confirmDialog(`Usunąć cel „${goal.name}"?`)) onRemove(goal.id);
  };

  return (
    <section className="space-y-4 rounded-2xl bg-surface-1 p-5" aria-label="Moje cele">
      <h2 className="text-base font-semibold">Moje cele</h2>
      {goals.length === 0 ? (
        <p className="text-sm text-text-muted">Dodaj cel, a pokażę postęp: wakacje, fundusz awaryjny, auto.</p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
            return (
              <li key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-base font-medium">{goal.name}</p>
                  <Pressable type="button" onClick={() => void remove(goal)} aria-label={`Usuń cel ${goal.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted hover:text-danger">
                    <Trash2 size={18} aria-hidden="true" />
                  </Pressable>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm tabular-nums text-text-muted">{formatPln(goal.current_amount)} z {formatPln(goal.target_amount)} · {pct.toFixed(0)}%</p>
                  <SavedInput key={goal.current_amount} goal={goal} onSave={(value) => onUpdate(goal.id, value)} />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={goal.name}>
                  <div className="h-full rounded-full bg-success transition-[width] duration-[var(--motion-slow)]" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <AddGoalForm onAdd={onAdd} />
    </section>
  );
}
