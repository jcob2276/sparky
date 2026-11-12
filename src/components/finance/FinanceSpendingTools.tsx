import { useState } from 'react';
import type { FinanceBundle } from '../../lib/financeApi';
import { getTodayWarsaw } from '../../lib/date';
import { compareSpending, simulatePurchase } from '../../lib/finance/spendingTools';
import { formatPln } from '../../lib/finance/formatMoney';
import Input from '../ui/Input';
import type { FinanceMetrics } from './useFinanceMetrics';

export function FinanceSpendingTools({ transactions, metrics }: { transactions: FinanceBundle['transactions']; metrics: FinanceMetrics }) {
  const [amount, setAmount] = useState('');
  const today = getTodayWarsaw();
  const comparison = compareSpending(transactions, today);
  const [year, month, day] = today.split('-').map(Number);
  const days = new Date(year, month, 0).getDate() - day + 1;
  const purchase = Number(amount.replace(',', '.'));
  const valid = amount.trim() !== '' && Number.isFinite(purchase) && purchase > 0;
  const result = simulatePurchase(metrics.effectiveExpenses, metrics.spentThisMonth, valid ? purchase : 0, days);
  return (
    <section className="space-y-2" aria-label="Wydatki pod kontrolą">
      <h2 className="ios-section-title px-1">Wydatki pod kontrolą</h2>
      <div className="ios-group">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm font-medium text-text-primary">W porównaniu z poprzednim miesiącem</p>
            <p className="mt-1 text-xs text-text-muted">Od 1. do {day}. dnia miesiąca · zapisane transakcje</p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-semibold tabular-nums ${comparison.difference != null && comparison.difference > 0 ? 'text-warning' : 'text-text-primary'}`}>
              {comparison.difference == null ? '—' : `${comparison.difference > 0 ? '+' : ''}${formatPln(comparison.difference)}`}
            </p>
            <p className="text-xs text-text-muted">{comparison.previous == null ? 'Brak historii do porównania' : `Poprzednio ${formatPln(comparison.previous)}`}</p>
          </div>
        </div>
        <div className="ios-glass-divider" />
        <div className="space-y-3 px-4 py-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Czy zakup zmieści się w planie?</h3>
            <p className="mt-1 text-xs text-text-muted">Sprawdź wpływ na budżet. Symulacja nie zapisuje wydatku.</p>
          </div>
          {metrics.hasBudget ? <>
            <Input aria-label="Kwota planowanego zakupu" inputMode="decimal" placeholder="Kwota zakupu w zł" value={amount} onChange={event => setAmount(event.target.value)} />
            {valid && <div aria-live="polite" className="rounded-xl bg-surface-2 px-4 py-3">
              <p className={`text-sm font-medium ${result.overBudget ? 'text-warning' : 'text-text-primary'}`}>
                {result.overBudget ? `${formatPln(Math.abs(result.remaining))} ponad miesięczny plan` : `Po zakupie zostaje ${formatPln(result.remaining)}`}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{formatPln(result.daily)} dziennie przez {days} dni · bez przyszłych wpływów</p>
            </div>}
          </> : <p className="text-sm text-text-secondary">Ustal plan wydatków w Przepływach, aby uruchomić symulację.</p>}
        </div>
      </div>
    </section>
  );
}
