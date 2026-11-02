import type { PlanDay } from '../../lib/closer/monthPlan';

interface MonthPlanDayProps {
  day: PlanDay;
  actual: number;
  sales: number;
  today: string;
}

const dayNumber = (date: string) => Number(date.slice(8));

export function MonthPlanDay({ day, actual, sales, today }: MonthPlanDayProps) {
  const isToday = day.date === today;
  const isPast = day.date < today;
  const label = `${dayNumber(day.date)}.${day.date.slice(5, 7)}`;

  if (day.kind === 'reserve') {
    return (
      <div
        className={`flex min-h-20 flex-col justify-between rounded-xl border border-dashed border-border-custom/40 p-2 ${isToday ? 'ring-2 ring-primary' : ''}`}
        aria-label={`${label} rezerwa${actual ? `, umówiono ${actual}` : ''}`}
      >
        <span className="text-xs text-text-muted">{dayNumber(day.date)}</span>
        <span className="text-xs text-text-tertiary">{actual > 0 ? `+${actual}` : 'rezerwa'}</span>
      </div>
    );
  }

  const ratio = day.target > 0 ? Math.min(1, actual / day.target) : 0;
  const met = actual >= day.target;
  const tone = isPast ? (met ? 'bg-success/10' : 'bg-warning/10') : 'bg-surface-1/70';
  const bar = met ? 'bg-success' : isPast ? 'bg-warning' : 'bg-primary';

  return (
    <div
      className={`flex min-h-20 flex-col justify-between rounded-xl p-2 ring-1 ring-border-custom/25 ${tone} ${isToday ? '!ring-2 !ring-primary' : ''}`}
      aria-label={`${label}, minimum ${day.target}, umówiono ${actual}${sales ? `, sprzedaży ${sales}` : ''}`}
    >
      <div className="flex items-start justify-between">
        <span className={`text-xs ${isToday ? 'font-semibold text-primary' : 'text-text-muted'}`}>{dayNumber(day.date)}</span>
        {sales > 0 && <span className="text-xs font-semibold text-success">sprz. {sales}</span>}
      </div>
      <div>
        <p className="text-lg font-semibold tabular-nums leading-none tracking-[var(--tracking-tight)] text-text-primary">
          {isPast || actual > 0 ? `${actual}/${day.target}` : day.target}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{day.minutes} min</p>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
