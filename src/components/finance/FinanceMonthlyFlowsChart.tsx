import { useMemo } from 'react';
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinanceTransaction } from '../../lib/financeApi';
import { getTodayWarsaw } from '../../lib/date';
import { formatPln } from '../../lib/finance/formatMoney';
import { averageFlows, buildMonthlyFlows } from '../../lib/finance/monthlyFlows';
import { Money } from './FinanceMoney';

const MONTH_LABEL = new Intl.DateTimeFormat('pl-PL', { month: 'short' });
const label = (month: string) => MONTH_LABEL.format(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)).replace('.', '');

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { month: string; income: number; expense: number } }> }) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border-custom bg-surface-solid px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-text-primary">{label(row.month)} {row.month.slice(0, 4)}</p>
      <p className="tabular-nums text-success">Wpływy {formatPln(row.income)}</p>
      <p className="tabular-nums text-danger">Wydatki {formatPln(row.expense)}</p>
    </div>
  );
}

/** Income against spending for the last six months, with the average spending as a dashed line. */
export function FinanceMonthlyFlowsChart({ transactions }: { transactions: FinanceTransaction[] }) {
  const flows = useMemo(() => buildMonthlyFlows(transactions, getTodayWarsaw(), 6), [transactions]);
  const average = averageFlows(flows);
  if (average.months === 0) return null;
  const saved = average.income - average.expense;

  return (
    <section aria-label="Przepływy miesiąc po miesiącu">
      <header className="mb-2 px-1">
        <h2 className="ios-section-title">Miesiąc po miesiącu</h2>
      </header>
      <div className="ios-group space-y-3 p-4">
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />Wpływy</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" aria-hidden="true" />Wydatki</span>
        </div>
        <div className="h-44" role="img" aria-label="Wpływy i wydatki w ostatnich sześciu miesiącach">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 176 }}>
            <BarChart data={flows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barGap={3}>
              <XAxis dataKey="month" tickFormatter={label} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis hide />
              <Tooltip content={<Tip />} cursor={{ fill: 'var(--surface-2)', opacity: 0.5 }} />
              <ReferenceLine y={average.expense} stroke="var(--text-muted)" strokeDasharray="4 4" />
              <Bar dataKey="income" fill="var(--color-success)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="expense" fill="var(--color-danger)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-baseline justify-between border-t border-border-custom/15 pt-3 text-sm">
          <span className="text-text-muted">Średnio wydajesz</span>
          <Money value={average.expense} className="font-semibold text-text-primary" />
        </div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-text-muted">{saved >= 0 ? 'Średnio odkładasz' : 'Średnio brakuje'}</span>
          <Money value={Math.abs(saved)} className={`font-semibold ${saved >= 0 ? 'text-success' : 'text-danger'}`} />
        </div>
        <p className="text-xs text-text-muted">Średnia z {average.months} {average.months === 1 ? 'miesiąca z danymi' : 'miesięcy z danymi'}; przerywana linia to średnie wydatki.</p>
      </div>
    </section>
  );
}
