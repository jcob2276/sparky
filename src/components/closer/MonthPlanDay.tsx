import type { DayActual, PlanDay } from '../../lib/closer/monthPlan';
import { Pressable } from '../ui/ControlPrimitives';

interface MonthPlanDayProps {
  day: PlanDay;
  actual: DayActual | undefined;
  today: string;
  selected: boolean;
  onSelect: (date: string) => void;
}

const dayNumber = (date: string) => Number(date.slice(8));

export function MonthPlanDay({ day, actual, today, selected, onSelect }: MonthPlanDayProps) {
  const booked = actual?.appointments ?? 0;
  const calls = actual?.salesCalls ?? 0;
  const sales = actual?.salesClosed ?? 0;
  const isToday = day.date === today;
  const isPast = day.date < today;
  const label = `${dayNumber(day.date)}.${day.date.slice(5, 7)}`;
  const ring = selected ? '!ring-2 !ring-primary' : isToday ? '!ring-2 !ring-primary/50' : '';
  const base = `flex min-h-20 w-full flex-col justify-between rounded-lg p-2 text-left ${ring}`;
  const counts = `umówiono ${booked}, sales calli ${calls}${sales ? `, sprzedaży ${sales}` : ''}`;

  if (day.kind === 'reserve') {
    return (
      <Pressable
        onClick={() => onSelect(day.date)}
        className={`${base} border border-dashed border-border-custom/40`}
        aria-label={`${label} rezerwa, ${counts}`}
      >
        <span className="text-xs text-text-muted">{dayNumber(day.date)}</span>
        <span className="text-xs tabular-nums text-text-tertiary">{booked > 0 ? `+${booked}` : 'rezerwa'}</span>
      </Pressable>
    );
  }

  const ratio = day.target > 0 ? Math.min(1, booked / day.target) : 0;
  const met = booked >= day.target;
  const tone = isPast ? (met ? 'bg-success/10' : 'bg-warning/10') : 'bg-surface-1/70';
  const bar = met ? 'bg-success' : isPast ? 'bg-warning' : 'bg-primary';

  return (
    <Pressable
      onClick={() => onSelect(day.date)}
      className={`${base} ring-1 ring-border-custom/25 ${tone}`}
      aria-label={`${label}, minimum ${day.target}, ${counts}`}
    >
      <div className="flex w-full items-start justify-between">
        <span className={`text-xs ${isToday ? 'font-semibold text-primary' : 'text-text-muted'}`}>{dayNumber(day.date)}</span>
        {sales > 0 && <span className="text-xs font-semibold text-success">sprz. {sales}</span>}
      </div>
      <div>
        <p className="text-lg font-semibold tabular-nums leading-none tracking-[var(--tracking-tight)] text-text-primary">
          {isPast || booked > 0 ? `${booked}/${day.target}` : day.target}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{calls > 0 ? `calle ${calls}` : `${day.minutes} min`}</p>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </Pressable>
  );
}
