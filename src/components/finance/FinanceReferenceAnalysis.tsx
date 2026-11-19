import { Pressable } from '../ui/ControlPrimitives';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import type { FinanceTransaction } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceMonthlyFlowsChart } from './FinanceMonthlyFlowsChart';
import { FinanceReferenceCategories } from './FinanceReferenceViews';
import { financePeriodBounds, financePeriodTotals, type FinancePeriod } from './financeReferencePeriods';
import { formatMonthLabel } from './financeNarrative';

const SCALES = [['week', 'Tydzień'], ['month', 'Miesiąc'], ['year', 'Rok']] as const;
const formatDay = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'Europe/Warsaw' });
const labelDay = (day: string) => formatDay.format(new Date(`${day}T12:00:00Z`));

export default function FinanceReferenceAnalysis({ transactions, onCategory }: {
  transactions: FinanceTransaction[];
  onCategory: (category: string, month: string) => void;
}) {
  const [scale, setScale] = useState<FinancePeriod>('month');
  const [offset, setOffset] = useState(0);
  const today = getTodayWarsaw();
  const [start, end] = financePeriodBounds(today, scale, offset);
  const [previousStart, previousEnd] = financePeriodBounds(today, scale, offset + 1);
  const partial = end > today;
  const elapsed = (Date.parse(today) - Date.parse(start)) / 86_400_000;
  const previousLimit = partial ? [previousEnd, shiftDateStr(previousStart, elapsed)].sort()[0] : previousEnd;
  const within = (from: string, to: string) => transactions.filter((item) => item.transaction_date >= from && item.transaction_date <= to);
  const current = within(start, partial ? today : end);
  const earlier = within(previousStart, previousLimit);
  const value = financePeriodTotals(current);
  const previous = financePeriodTotals(earlier);
  const saving = (period: typeof value) => period.income > 0 ? `${(100 * period.balance / period.income).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%` : '—';
  const cards = [
    ['Wpływy', formatPln(value.income, 2), formatPln(previous.income, 2)],
    ['Wydatki', formatPln(value.expenses, 2), formatPln(previous.expenses, 2)],
    ['Bilans', formatPln(value.balance, 2), formatPln(previous.balance, 2)],
    ['Oszczędzanie', saving(value), saving(previous)],
  ];

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
      <FinanceReferenceCategories transactions={current} onCategory={(category) => onCategory(category, (current.find((tx) => tx.category === category)?.transaction_date ?? start).slice(0, 7))} />
      <FinanceMonthlyFlowsChart transactions={transactions} />
    </div>
  );
}
