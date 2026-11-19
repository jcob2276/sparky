import { useState } from 'react';
import { BANK_CATEGORY_LABELS } from '@vanguard/domain';
import type { CategorySpending } from '../../../lib/finance/bankSpending';
import type { CategoryBudgets } from '../../../lib/finance/categoryBudgetsApi';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import Button from '../../ui/Button';
import Sheet from '../../ui/Sheet';
import { ControlInput, ControlSelect, Pressable } from '../../ui/ControlPrimitives';

interface Props {
  spending: CategorySpending[];
  budgets: CategoryBudgets;
  currency: string;
  onSet: (category: string, limit: number | null) => void;
}

const EDITABLE = Object.keys(BANK_CATEGORY_LABELS).filter(key => !['do_sprawdzenia', 'przelewy_wlasne', 'inwestycje', 'gotowka', 'wynagrodzenie', 'zwrot', 'dzialalnosc', 'dochody_kapitalowe'].includes(key));

/** Koperty: limit miesięczny na kategorię z paskiem, ile już poszło. Limity ustawiasz sam, nic nie jest narzucane. */
export function BankEnvelopes({ spending, budgets, currency, onSet }: Props) {
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(EDITABLE[0]);
  const [value, setValue] = useState('');
  const spent = new Map(spending.map(item => [item.category as string, item.total]));
  const entries = Object.entries(budgets).sort((a, b) => (spent.get(b[0]) ?? 0) / b[1] - (spent.get(a[0]) ?? 0) / a[1]);
  const parsed = Number(value.replace(',', '.'));

  return (
    <section aria-label="Koperty">
      <header className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="ios-section-title">Koperty</h2>
        <Pressable type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-primary">Ustaw limit</Pressable>
      </header>
      <div className="ios-group divide-y divide-border-custom/20">
        {entries.length === 0 && <p className="p-4 text-sm text-text-muted">Ustaw miesięczny limit na kategorię, np. jedzenie na mieście, a pokażę, ile zostało.</p>}
        {entries.map(([key, limit]) => {
          const used = spent.get(key) ?? 0;
          const over = used > limit;
          return (
            <Pressable key={key} type="button" onClick={() => { setCategory(key); setValue(String(limit)); setEditing(true); }} className="block w-full px-4 py-3 text-left">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-text-primary">{BANK_CATEGORY_LABELS[key as keyof typeof BANK_CATEGORY_LABELS] ?? key}</span>
                <span className={`text-sm font-semibold tabular-nums ${over ? 'text-danger' : 'text-text-primary'}`}>
                  {over ? `${formatCurrency(used - limit, currency)} ponad limit` : `zostało ${formatCurrency(limit - used, currency)}`}
                </span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span className={`block h-full rounded-full ${over ? 'bg-danger' : used / limit > 0.8 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
              </span>
              <span className="mt-1 block text-xs text-text-muted">{formatCurrency(used, currency)} z {formatCurrency(limit, currency)}</span>
            </Pressable>
          );
        })}
      </div>
      <Sheet open={editing} onOpenChange={setEditing} title="Limit kategorii" side="bottom" compact handleDragOnly>
        <form className="space-y-3 p-1" onSubmit={event => { event.preventDefault(); if (parsed > 0) { onSet(category, parsed); setEditing(false); setValue(''); } }}>
          <ControlSelect aria-label="Kategoria" value={category} onChange={event => { setCategory(event.target.value); setValue(budgets[event.target.value] ? String(budgets[event.target.value]) : ''); }}
            className="w-full">
            {EDITABLE.map(key => <option key={key} value={key}>{BANK_CATEGORY_LABELS[key as keyof typeof BANK_CATEGORY_LABELS]}</option>)}
          </ControlSelect>
          <ControlInput type="number" inputMode="decimal" min="1" aria-label="Limit miesięczny" placeholder="Limit miesięczny" value={value} onChange={event => setValue(event.target.value)} />
          <Button type="submit" className="w-full" disabled={!(parsed > 0)}>Zapisz limit</Button>
          {budgets[category] != null && <Button type="button" variant="ghost" className="w-full" onClick={() => { onSet(category, null); setEditing(false); }}>Usuń limit</Button>}
        </form>
      </Sheet>
    </section>
  );
}
