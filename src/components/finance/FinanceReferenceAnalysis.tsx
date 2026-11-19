import { Pressable } from '../ui/ControlPrimitives';
import { RETURNED_PURCHASE_LABEL } from '@vanguard/domain';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import type { FinanceTransaction } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceMonthlyFlowsChart } from './FinanceMonthlyFlowsChart';
import { financePeriodBounds, financePeriodTotals, financeRecordsInRange, movement, type FinancePeriod } from './financeReferencePeriods';
import { formatMonthLabel } from './financeNarrative';

const SCALES = [['week', 'Tydzień'], ['month', 'Miesiąc'], ['year', 'Rok']] as const;
const formatDay = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'Europe/Warsaw' });
const labelDay = (day: string) => formatDay.format(new Date(`${day}T12:00:00Z`));

function partyTotals(records: FinanceTransaction[], kind: 'income' | 'expense') {
  const totals = new Map<string, { label: string; cents: number; count: number }>();
  for (const tx of records) {
    if (movement(tx) !== kind) continue;
    const label = tx.note?.trim() || tx.category.trim() || 'Bez opisu';
    const key = label.normalize('NFC').toLocaleLowerCase('pl');
    const row = totals.get(key) ?? { label, cents: 0, count: 0 };
    row.cents += Math.round(Math.abs(tx.amount) * 100);
    row.count++;
    totals.set(key, row);
  }
  return totals;
}

function FinanceRanking({ title, rows }: { title: string; rows: { label: string; amount: number; count?: number }[] }) {
  return (
    <section className="finance-reference-card space-y-2" aria-label={title}>
      <h2 className="finance-reference-label">{title}</h2>
      {rows.length > 0 ? <dl className="finance-reference-breakdown">
        {rows.map(({ label, amount, count }) => <div key={label}>
          <dt className="min-w-0 break-words">{label}{count != null && <small className="block">{count} trans.</small>}</dt>
          <dd>{count == null && amount > 0 ? '+' : ''}{formatPln(amount, 2)}</dd>
        </div>)}
      </dl> : <p className="text-sm text-text-muted">Brak danych w tym okresie.</p>}
    </section>
  );
}

export default function FinanceReferenceAnalysis({ transactions }: { transactions: FinanceTransaction[] }) {
  const [scale, setScale] = useState<FinancePeriod>('month');
  const [offset, setOffset] = useState(0);
  const today = getTodayWarsaw();
  const [start, end] = financePeriodBounds(today, scale, offset);
  const [previousStart, previousEnd] = financePeriodBounds(today, scale, offset + 1);
  const partial = end > today;
  const elapsed = (Date.parse(today) - Date.parse(start)) / 86_400_000;
  const previousLimit = partial ? [previousEnd, shiftDateStr(previousStart, elapsed)].sort()[0] : previousEnd;
  const currentRange = { from: start, to: partial ? today : end };
  const included = transactions.filter((tx) => tx.source !== 'bank' || tx.category !== RETURNED_PURCHASE_LABEL);
  const current = financeRecordsInRange(included, currentRange);
  const earlier = financeRecordsInRange(included, { from: previousStart, to: previousLimit });
  const value = financePeriodTotals(current);
  const previous = financePeriodTotals(earlier);
  const saving = (period: typeof value) => period.income > 0 ? `${(100 * period.balance / period.income).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%` : '—';
  const cards = [
    ['Wpływy', formatPln(value.income, 2), formatPln(previous.income, 2)],
    ['Wydatki', formatPln(value.expenses, 2), formatPln(previous.expenses, 2)],
    ['Bilans', formatPln(value.balance, 2), formatPln(previous.balance, 2)],
    ['Oszczędzanie', saving(value), saving(previous)],
  ];

  const expenses = partyTotals(current, 'expense');
  const priorExpenses = partyTotals(earlier, 'expense');
  const rank = (rows: ReturnType<typeof partyTotals>) => [...rows.values()]
    .sort((a, b) => b.cents - a.cents || a.label.localeCompare(b.label, 'pl'))
    .slice(0, 10).map((row) => ({ ...row, amount: row.cents / 100 }));
  const changes = [...new Map([...priorExpenses, ...expenses])].map(([key, row]) => ({
    label: row.label, amount: ((expenses.get(key)?.cents ?? 0) - (priorExpenses.get(key)?.cents ?? 0)) / 100,
  })).filter((row) => row.amount !== 0).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="finance-reference-segment" aria-label="Okres analizy">
        {SCALES.map(([key, label]) => <Pressable type="button" key={key} aria-pressed={scale === key} onClick={() => { setScale(key); setOffset(0); }}>{label}</Pressable>)}
      </div>
      <div className="finance-reference-period">
        <Pressable type="button" aria-label="Poprzedni okres" onClick={() => setOffset(offset + 1)}><ChevronLeft size={17} /></Pressable>
        <strong className="capitalize">{scale === 'month' ? formatMonthLabel(start.slice(0, 7)) : scale === 'year' ? start.slice(0, 4) : `${labelDay(start)} – ${labelDay(end)}`}</strong>
        <Pressable type="button" aria-label="Następny okres" disabled={!offset} onClick={() => setOffset(offset - 1)}><ChevronRight size={17} /></Pressable>
      </div>
      <section className="finance-reference-metrics" aria-label="Zestawienie okresu">
        {cards.map(([name, amount, comparison]) => (
          <div className="finance-reference-card" key={name}>
            <h2>{name}</h2><strong className="tabular-nums">{amount}</strong>
            {earlier.length > 0 && <small>Poprzedni okres: {comparison}</small>}
          </div>
        ))}
      </section>
      {partial && earlier.length > 0 && <p className="text-sm text-text-muted">Okres trwa. Porównanie obejmuje ten sam fragment poprzedniego okresu.</p>}
      <FinanceRanking title="Najwięksi odbiorcy wydatków" rows={rank(expenses)} />
      <FinanceRanking title="Największe źródła wpływów" rows={rank(partyTotals(current, 'income'))} />
      {earlier.length > 0 && <FinanceRanking title="Co się zmieniło w wydatkach" rows={changes} />}
      <FinanceMonthlyFlowsChart transactions={included} />
    </div>
  );
}
