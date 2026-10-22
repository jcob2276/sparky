import { useState } from 'react';
import { ControlInput } from '../ui/ControlPrimitives';
import { FinanceSection } from './financeUi';

interface FinanceBudgetFieldProps {
  monthlyExpenses: number;
  onSave: (monthlyExpenses: number) => void;
}

/** Jedyne założenie, z którego liczy się „zostaje na dziś”: plan wydatków na miesiąc. */
export function FinanceBudgetField({ monthlyExpenses, onSave }: FinanceBudgetFieldProps) {
  const [value, setValue] = useState(monthlyExpenses > 0 ? String(monthlyExpenses) : '');

  function commit() {
    const amount = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0 || amount === monthlyExpenses) return;
    onSave(amount);
  }

  return (
    <FinanceSection title="Plan wydatków" subtitle="Z tego liczę, ile zostaje na dziś.">
      <label className="flex items-center gap-3 px-4 py-4">
        <span className="sr-only">Plan wydatków na miesiąc</span>
        <ControlInput
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="np. 4800"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          className="min-h-12 w-full rounded-xl border-0 bg-surface-2/80 px-4 text-lg tabular-nums ring-1 ring-border-custom/30 transition-shadow focus:ring-2 focus:ring-primary/40"
        />
        <span className="shrink-0 text-sm text-text-muted">zł / mies.</span>
      </label>
    </FinanceSection>
  );
}
