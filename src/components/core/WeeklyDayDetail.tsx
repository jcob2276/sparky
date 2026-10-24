import { Check, Quote, X } from 'lucide-react';
import { categoryLabel } from '../../lib/weekInsights';
import type { WinsDayCell } from '../../lib/weeklyWinsMap';
import { formatDayLabel } from '../../lib/date';

interface WeeklyDayDetailProps {
  day: WinsDayCell;
  today: string;
  yesterday: string;
}

/** What the user planned for one day, what got done, how they rated it and what they wrote about it. */
export default function WeeklyDayDetail({ day, today, yesterday }: WeeklyDayDetailProps) {
  return (
    <section
      aria-label={`Szczegóły dnia ${day.date}`}
      className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{formatDayLabel(day.date, today, yesterday, true)}</h3>
        <p className="flex items-baseline gap-2 text-xs font-semibold text-text-muted">
          <span>{day.doneCount}/{day.plannedCount || 5} zadań</span>
          {day.score != null && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">ocena {day.score}/10</span>
          )}
        </p>
      </div>

      {day.tasks.length === 0 ? (
        <p className="text-sm text-text-secondary">Brak planu na ten dzień.</p>
      ) : (
        <ul className="divide-y divide-border-custom/30">
          {day.tasks.map((task) => (
            <li key={task.slot} className="flex items-center gap-3 py-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  task.done ? 'bg-success/15 text-success' : 'bg-danger/10 text-danger'
                }`}
                role="img"
                aria-label={task.done ? 'Zrobione' : 'Niezrobione'}
              >
                {task.done ? <Check size={14} /> : <X size={14} />}
              </span>
              <span className={`min-w-0 flex-1 text-sm leading-snug ${task.done ? 'text-text-primary' : 'text-text-secondary'}`}>
                {task.title}
              </span>
              <span className="shrink-0 text-2xs font-semibold text-text-muted">{categoryLabel(task.category)}</span>
            </li>
          ))}
        </ul>
      )}

      {day.note && (
        <p className="flex items-start gap-2 border-t border-border-custom/30 pt-3 text-sm leading-snug text-text-secondary">
          <Quote size={13} className="mt-1 shrink-0 text-text-muted" aria-hidden="true" />
          {day.note}
        </p>
      )}
    </section>
  );
}
