import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ToggleChip } from '../ui/ToggleChip';
import { PILLARS, type ReviewContext, type ReviewDay, type ReviewTaskItem } from '../../lib/goal/reviewCycle.data';
import { goalAlignment, tasksOnDay, weekdayShort } from '../../lib/goal/reviewWeekInsights';

type Tasks = NonNullable<ReviewContext['tasks']>;

const PILLAR_LABEL: Record<string, string> = Object.fromEntries(PILLARS.map(({ key, label }) => [key, label]));

function TaskRow({ task }: { task: ReviewTaskItem }) {
  const pillar = task.category ? PILLAR_LABEL[task.category] : undefined;
  return (
    <li className="flex items-start gap-2 text-xs">
      {task.done ? (
        <Check size={13} className="mt-0.5 shrink-0 text-success" aria-label="zrobione" />
      ) : (
        <X size={13} className="mt-0.5 shrink-0 text-danger" aria-label="niezrobione" />
      )}
      <span className={`min-w-0 flex-1 leading-snug ${task.done ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
        {task.title}
      </span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold ${pillar ? 'bg-primary/10 text-primary' : 'bg-warning/15 text-text-secondary'}`}
      >
        {pillar ?? 'bez filaru'}
      </span>
    </li>
  );
}

function DayList({ date, tasks, score }: { date: string; tasks: ReviewTaskItem[]; score: number | null }) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center justify-between text-2xs font-bold text-text-secondary">
        <span>
          {weekdayShort(date)} {date.slice(8)}.{date.slice(5, 7)}
        </span>
        <span className="font-semibold normal-case text-text-muted">
          {tasks.length > 0 ? `${done}/${tasks.length} zrobione` : 'brak planu'}
          {score != null ? ` · ocena ${score}/10` : ''}
        </span>
      </p>
      {tasks.length > 0 ? (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      ) : (
        <p className="text-2xs italic text-text-muted">Nic nie rozpisałeś na ten dzień.</p>
      )}
    </div>
  );
}

/** Czy zadania z całego tygodnia szły w stronę celów: zgodność z filarami i plan dzień po dniu, jak go sam rozpisałeś. */
export default function ReviewDayTasks({ days, tasks }: { days: ReviewDay[]; tasks: Tasks }) {
  const alignment = goalAlignment(tasks);
  const lastWithTasks = [...days].reverse().find((d) => tasksOnDay(tasks, d.date).length > 0)?.date;
  const [selected, setSelected] = useState<string>(lastWithTasks ?? days[0]?.date ?? '');
  if (alignment.total === 0) return null;

  const shown = selected === 'all' ? days : days.filter((d) => d.date === selected);

  return (
    <div className="space-y-3 border-t border-border-custom/50 pt-3">
      <div className="space-y-1.5">
        <span className="block text-2xs font-bold text-text-muted">Czy to prowadziło do celów</span>
        <p className="text-xs leading-snug text-text-primary">
          Na cele pracowało <strong className="tabular-nums">{alignment.onGoal}</strong> z{' '}
          <strong className="tabular-nums">{alignment.total}</strong> zadań. Z nich zrobiłeś{' '}
          <strong className="tabular-nums">
            {alignment.onGoalDone}/{alignment.onGoal}
          </strong>
          , a z tych bez filaru <strong className="tabular-nums">{alignment.offDone}/{alignment.off}</strong>.
        </p>
        <div className="flex flex-wrap gap-1.5 text-2xs text-text-secondary">
          {alignment.byPillar.map(({ key, count }) => (
            <span key={key} className="rounded bg-surface-2 px-1.5 py-0.5">
              {PILLAR_LABEL[key]}: <strong className="tabular-nums text-text-primary">{count}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div role="group" aria-label="Dzień tygodnia" className="flex flex-wrap gap-1">
          {days.map((d) => (
            <ToggleChip key={d.date} active={selected === d.date} onClick={() => setSelected(d.date)}>
              {weekdayShort(d.date)}
            </ToggleChip>
          ))}
          <ToggleChip active={selected === 'all'} onClick={() => setSelected('all')}>
            Wszystkie
          </ToggleChip>
        </div>
        <div className="space-y-3">
          {shown.map((d) => (
            <DayList key={d.date} date={d.date} tasks={tasksOnDay(tasks, d.date)} score={d.score} />
          ))}
        </div>
      </div>
    </div>
  );
}
