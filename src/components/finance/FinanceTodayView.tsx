import { formatPln } from '../../lib/finance/formatMoney';
import { formatMonthLabel } from './financeNarrative';
import type { CashflowMonthSummary } from '@vanguard/domain';
import {
  FinanceEmpty,
  FinanceList,
  FinanceRow,
  FinanceSection,
} from './financeUi';

interface FinanceTodayViewProps {
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

/** Planning segment: what is still ahead this month. The "left today" summary lives on Pulpit and is not repeated here. */
export function FinanceTodayView({ monthKey, cashflow, todayDay }: FinanceTodayViewProps) {
  return <MonthAhead monthKey={monthKey} summary={cashflow} todayDay={todayDay} />;
}
