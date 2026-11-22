import { Moon } from 'lucide-react';
import type { ReviewDay } from '../../lib/goal/reviewCycle.data';
import { bestAndWorstDay, weekdayShort } from '../../lib/goal/reviewWeekInsights';

function scoreColor(score: number) {
  if (score <= 3) return 'bg-danger';
  if (score <= 6) return 'bg-warning';
  return 'bg-success';
}

function DayColumn({ day, best }: { day: ReviewDay; best: boolean }) {
  const height = day.score != null ? `${Math.max(10, day.score * 10)}%` : '0%';
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 ${best ? 'bg-success/10 ring-1 ring-success/40' : ''}`}
      aria-label={`${weekdayShort(day.date)}: ocena ${day.score ?? 'brak'}, sen ${day.sleepHours ?? 'brak'} h, zadania ${day.tasksDone}/${day.tasksTotal}`}
    >
      <span className="text-2xs font-semibold text-text-muted">{weekdayShort(day.date)}</span>
      <div className="flex h-16 w-full items-end justify-center rounded bg-surface-2/60">
        {day.score != null ? (
          <div className={`w-3/5 rounded-t ${scoreColor(day.score)}`} style={{ height }} />
        ) : (
          <span className="mb-1 text-2xs text-text-muted">–</span>
        )}
      </div>
      <span className="text-2xs font-bold text-text-primary">{day.score ?? '–'}</span>
      <span className="text-2xs tabular-nums text-text-secondary">{day.sleepHours != null ? `${day.sleepHours}h` : '–'}</span>
      <span className="text-2xs tabular-nums text-text-muted">{day.bedtime ?? '–'}</span>
      <span className="text-2xs tabular-nums text-text-secondary">
        {day.tasksTotal > 0 ? `${day.tasksDone}/${day.tasksTotal}` : '–'}
      </span>
    </div>
  );
}

function DaySummary({ label, day, tone }: { label: string; day: ReviewDay; tone: string }) {
  const parts = [
    `${day.score}/10`,
    day.bedtime ? `zaśnięcie ${day.bedtime}` : null,
    day.sleepHours != null ? `sen ${day.sleepHours} h` : null,
    day.tasksTotal > 0 ? `zadania ${day.tasksDone}/${day.tasksTotal}` : null,
  ].filter(Boolean);
  return (
    <p className="text-2xs text-text-secondary">
      <span className={`font-bold ${tone}`}>{label}: {weekdayShort(day.date)}</span> · {parts.join(' · ')}
    </p>
  );
}

/** Tydzień w jednym rzucie oka: ocena dnia (słupek), sen z godziną zaśnięcia i domknięte zadania. */
export default function ReviewWeekStrip({ days }: { days: ReviewDay[] }) {
  const { best, worst } = bestAndWorstDay(days);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1">
        <div className="flex flex-col items-end gap-1 py-1.5 pr-1 text-2xs text-text-muted">
          <span>&nbsp;</span>
          <span className="flex h-16 items-center">ocena</span>
          <span>&nbsp;</span>
          <span className="flex items-center gap-0.5"><Moon size={9} />sen</span>
          <span>zaśn.</span>
          <span>plan</span>
        </div>
        {days.map((d) => (
          <DayColumn key={d.date} day={d} best={best?.date === d.date} />
        ))}
      </div>
      {best && <DaySummary label="Najlepszy" day={best} tone="text-success" />}
      {worst && <DaySummary label="Najsłabszy" day={worst} tone="text-danger" />}
    </div>
  );
}
