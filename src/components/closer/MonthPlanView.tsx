import { MEETINGS_PER_BLOCK, type DayActual, type MonthPlan, type PlanProgress } from '../../lib/closer/monthPlan';
import { formatPln } from '../../lib/finance/formatMoney';
import { MonthPlanDay } from './MonthPlanDay';

interface MonthPlanViewProps {
  plan: MonthPlan;
  progress: PlanProgress;
  actuals: Record<string, DayActual>;
  today: string;
  targetPln: number;
}

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const short = (date: string) => `${Number(date.slice(8))}.${date.slice(5, 7)}`;

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-[var(--tracking-tight)] text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{hint}</p>
    </div>
  );
}

export function MonthPlanView({ plan, progress, actuals, today, targetPln }: MonthPlanViewProps) {
  const { totals } = plan;
  const pct = Math.min(100, (progress.bookedDone / totals.booked) * 100);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl bg-surface-1/70 p-4 ring-1 ring-border-custom/25">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-text-muted">Cel listopada</p>
          <p className="text-lg font-semibold tabular-nums text-text-primary">{formatPln(targetPln)}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Umówione" value={`${progress.bookedDone}/${totals.booked}`} hint={`odbyte ok. ${totals.held}`} />
          <Stat label="Sprzedaże" value={`${progress.salesDone}/${totals.sales}`} hint="min. 1 na tydzień" />
          <Stat
            label="Dziś"
            value={String(progress.todayNeeded)}
            hint={progress.todayNeeded > 0 ? `${progress.todayBlocks}× 60 min${progress.backlog ? `, w tym ${progress.backlog} zaległe` : ''}` : 'dzień wolny'}
          />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Umówione spotkania w miesiącu">
          <div className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-slow)] ease-[var(--ease-out)]" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section aria-label="Plan po dniach" className="space-y-3">
        <div className="grid grid-cols-7 gap-1.5 px-0.5 text-center text-xs text-text-muted">
          {WEEKDAYS.map((name) => <span key={name}>{name}</span>)}
        </div>
        {plan.weeks.map((week) => {
          const dates = week.cells.filter((cell) => cell !== null).map((cell) => cell.date);
          const booked = dates.reduce((sum, date) => sum + (actuals[date]?.appointments ?? 0), 0);
          const sold = dates.reduce((sum, date) => sum + (actuals[date]?.salesClosed ?? 0), 0);
          return (
            <div key={dates[0]} className="space-y-1.5">
              <div className="grid grid-cols-7 gap-1.5">
                {week.cells.map((cell, i) => cell
                  ? <MonthPlanDay key={cell.date} day={cell} actual={actuals[cell.date]?.appointments ?? 0} sales={actuals[cell.date]?.salesClosed ?? 0} today={today} />
                  : <div key={`empty-${i}`} aria-hidden="true" />)}
              </div>
              <p className="flex flex-wrap justify-between gap-x-3 px-1 text-xs text-text-muted">
                <span>{short(dates[0])}–{short(dates[dates.length - 1])}</span>
                <span className="tabular-nums">minimum {week.bookedMin} umówionych · zrobione {booked}</span>
                <span className="tabular-nums">sprzedaż {sold}/{week.salesMin}</span>
              </p>
            </div>
          );
        })}
      </section>

      <p className="px-1 text-sm leading-relaxed text-text-muted">
        Minimum dnia to liczba umówionych spotkań, nie odbytych. W {MEETINGS_PER_BLOCK} spotkań na godzinę wychodzi 60 min bloku.
        Sobota, niedziela i 11.11 są rezerwą na nadrabianie, więc zaległość z dni roboczych wlicza się w „Dziś”.
        Liczby bierzemy z dziennika closera.
      </p>
    </div>
  );
}
