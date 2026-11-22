import { useState } from 'react';
import Button from '../ui/Button';
import { PILLARS, type ReviewContext } from '../../lib/goal/reviewCycle.data';
import { tasksByPillar, type PillarTask } from '../../lib/goal/reviewWeekInsights';

const MAX_VISIBLE = 4;

function TaskChip({ task }: { task: PillarTask }) {
  const tone = task.done > 0 && task.missed === 0
    ? 'bg-success/15 text-success'
    : task.done === 0
      ? 'bg-danger/10 text-danger'
      : 'bg-warning/15 text-text-primary';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium ${tone}`}>
      <span className="max-w-44 truncate">{task.title}</span>
      <span className="tabular-nums opacity-80">
        {task.done > 0 && `✓${task.done}`}
        {task.done > 0 && task.missed > 0 && ' '}
        {task.missed > 0 && `✗${task.missed}`}
      </span>
    </span>
  );
}

export function TaskChips({ tasks, empty }: { tasks: PillarTask[]; empty: string }) {
  const [all, setAll] = useState(false);
  if (tasks.length === 0) return <p className="text-2xs italic text-text-muted">{empty}</p>;
  const visible = all ? tasks : tasks.slice(0, MAX_VISIBLE);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((t) => (
        <TaskChip key={t.title} task={t} />
      ))}
      {tasks.length > MAX_VISIBLE && (
        <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)} className="h-6 px-1.5 text-2xs">
          {all ? 'mniej' : `+${tasks.length - MAX_VISIBLE}`}
        </Button>
      )}
    </div>
  );
}

/**
 * Widok „Tydzień”: cele sprintu z bazy i pod każdym zadania tego tygodnia z tego filaru.
 * Od razu widać, które cele dostały realną pracę, a które tylko deklarację.
 */
export default function ReviewSprintGoals({ context }: { context: ReviewContext | undefined }) {
  const sprint = context?.sprintGoals;
  const tasks = context?.tasks;
  if (!sprint && !tasks) return null;
  const grouped = tasks ? tasksByPillar(tasks) : null;
  const unassigned = grouped?.inne ?? [];

  return (
    <div className="space-y-3">
      {!sprint && <p className="text-2xs font-semibold text-warning">Ten sprint nie ma jeszcze zapisanych celów.</p>}
      {sprint?.summary && !sprint.goals.cialo && !sprint.goals.duch && !sprint.goals.konto && (
        <p className="text-xs text-text-secondary">{sprint.summary}</p>
      )}

      <div className="space-y-3">
        {PILLARS.map(({ key, label }) => {
          const goal = sprint?.goals[key];
          const pillarTasks = grouped?.[key] ?? [];
          if (!goal && pillarTasks.length === 0) return null;
          return (
            <div key={key} className="space-y-1.5 border-l-2 border-primary/40 pl-2.5">
              <p className="text-xs leading-snug text-text-primary">
                <span className="font-bold">{label}:</span> {goal ?? <span className="italic text-text-muted">brak celu sprintu</span>}
              </p>
              <TaskChips tasks={pillarTasks} empty="Żadne zadanie w tym tygodniu nie pracowało na ten cel." />
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="space-y-1.5 border-t border-border-custom/50 pt-2">
          <p className="text-2xs font-semibold text-text-muted">Bez filaru ({unassigned.length}): nie pracują na żaden cel</p>
          <TaskChips tasks={unassigned} empty="" />
        </div>
      )}
    </div>
  );
}
