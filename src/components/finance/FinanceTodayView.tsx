import { formatPln } from '../../lib/finance/formatMoney';
import type { CashflowMonthSummary } from '@vanguard/domain';
import type { FinanceMetrics } from './useFinanceMetrics';
import {
  FinanceEmpty,
  FinanceList,
  FinanceProse,
  FinanceRow,
  FinanceSection,
} from './financeUi';
import {
  buildTodayContext,
  buildTodayHeadline,
  formatMonthLabel,
} from './financeNarrative';
import {
  buildBudgetProgress,
} from '../../lib/finance/financeTodayInsights';
import { FinanceBudgetProgress } from './FinanceBudgetProgress';

interface FinanceTodayViewProps {
  metrics: FinanceMetrics;
  monthKey: string;
  cashflow: CashflowMonthSummary;
  todayDay: number;
}

const EVENT_LABEL: Record<string, string> = {
  bill: 'rachunek',
  subscription: 'subskrypcja',
  income: 'wpływ',
  expense: 'wydatek',
};

function MonthAhead({
  monthKey,
  summary,
  todayDay,
}: {
  monthKey: string;
  summary: CashflowMonthSummary;
  todayDay: number;
}) {
  const activeDays = summary.days.filter((d) => d.events.length > 0);
  const monthLabel = formatMonthLabel(monthKey);

  return (
    <FinanceSection
      title="Nadchodzące"
      subtitle={activeDays.length > 0 ? `${monthLabel} · saldo końca ~${formatPln(summary.projectedEndBalance)}` : undefined}
    >
      {activeDays.length === 0 ? (
        <FinanceEmpty>
          Brak zaplanowanych przepływów w pozostałych dniach tego miesiąca.
        </FinanceEmpty>
      ) : (
        <FinanceList>
          {activeDays.map((day) => (
            <FinanceRow
              key={day.day}
              primary={(
                <span className={day.day === todayDay ? 'text-primary' : undefined}>
                  {day.day}. {day.day === todayDay ? 'dziś' : ''}
                </span>
              )}
              secondary={day.events.map((e) => `${EVENT_LABEL[e.kind] ?? e.kind}: ${e.name}`).join(' · ')}
              trailing={(
                <span className={day.net >= 0 ? 'text-success' : 'text-danger'}>
                  {formatPln(day.net)}
                </span>
              )}
            />
          ))}
        </FinanceList>
      )}
    </FinanceSection>
  );
}

export function FinanceTodayView({
  metrics,
  monthKey,
  cashflow,
  todayDay,
}: FinanceTodayViewProps) {
  const headline = buildTodayHeadline(metrics);
  const context = buildTodayContext(metrics);
  const monthLabel = formatMonthLabel(monthKey);
  const budgetProgress = buildBudgetProgress({
    effectiveExpenses: metrics.effectiveExpenses,
    spentThisMonth: metrics.spentThisMonth,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-3 pt-1">
        <p className="text-sm text-text-muted">Na dziś zostaje około</p>
        <p className="text-3xl font-semibold tabular-nums tracking-[var(--tracking-tight)] text-text-primary">{headline}</p>
        <FinanceProse>{context}</FinanceProse>
      </header>

      {metrics.hasBudget && budgetProgress && <FinanceBudgetProgress progress={budgetProgress} monthLabel={monthLabel} />}
      <MonthAhead monthKey={monthKey} summary={cashflow} todayDay={todayDay} />
    </div>
  );
}
