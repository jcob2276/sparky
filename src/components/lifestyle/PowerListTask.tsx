import { Check, Link2 } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { useHaptics } from '../../hooks/useHaptics';
import { TIMEZONE } from '../../lib/date';

type SphereIconType = React.ComponentType<{ size?: number | string; className?: string }>;

const COLOR_DOT: Record<string, string> = {
  indigo: 'bg-primary',
  violet: 'bg-primary',
  sky: 'bg-info',
  emerald: 'bg-success',
  amber: 'bg-warning',
  rose: 'bg-danger',
};

export interface PowerListTaskProps {
  index: number;
  task: string;
  done: boolean;
  completedAt: string | null;
  linkedTodoId: string | null;
  linkedProjectId: string | null;
  projectMap: Record<string, { name: string; color: string | null }>;
  toggleTask: (index: number) => void;
  sphere: { category: string; label: string; icon: SphereIconType; text: string; bg: string; border?: string } | null;
  targetValue: string | null;
  timeSlot: 'morning' | 'noon' | 'afternoon' | 'evening' | null;
}

/** Wiersz listy „Pięć zwycięstw” — rządzi się wewnątrz wspólnej karty (separatory z kontenera). */
export default function PowerListTask({
  index,
  task,
  done,
  completedAt,
  linkedTodoId,
  linkedProjectId,
  projectMap,
  toggleTask,
  sphere,
}: PowerListTaskProps) {
  const haptics = useHaptics();

  const linkedProject = linkedTodoId
    ? projectMap[linkedTodoId]
    : linkedProjectId
    ? projectMap[`task_project_${index + 1}`]
    : null;

  const doneTime = done && completedAt
    ? new Date(completedAt).toLocaleTimeString('pl-PL', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' })
    : null;

  const handleToggle = () => {
    if (done) haptics.selection();
    else haptics.success();
    toggleTask(index);
  };

  return (
    <Pressable
      haptic="none"
      aria-pressed={done}
      onClick={handleToggle}
      className="group flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left active:scale-100 active:bg-surface-solid/60"
    >
      <span
        className={`relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${
          done ? 'border-dayC' : 'border-border-custom group-hover:border-primary/60'
        } wins-circle`}
      >
        <span data-on={done} className="wins-circle-fill absolute inset-0 rounded-full bg-dayC" />
        <Check data-on={done} size={14} strokeWidth={3} className="wins-circle-check relative text-on-accent" />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`wins-title line-clamp-2 text-sm font-medium leading-snug ${
            done ? 'text-text-muted line-through' : 'text-text-primary'
          }`}
        >
          {task}
        </span>
        {linkedProject && (
          <span className="mt-0.5 flex items-center gap-1.5 text-2xs font-medium text-text-muted">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_DOT[linkedProject.color || ''] || 'bg-primary'}`} />
            <span className="truncate">{linkedProject.name}</span>
          </span>
        )}
        {!linkedProject && linkedTodoId && !done && (
          <span className="mt-0.5 flex items-center gap-1 text-2xs font-medium text-text-muted">
            <Link2 size={10} className="shrink-0 text-primary" />
            <span>Połączone zadanie</span>
          </span>
        )}
      </span>

      {(sphere || doneTime) && (
        <span className={`flex shrink-0 flex-col items-end gap-0.5 ${done ? 'opacity-[var(--opacity-60)]' : ''}`}>
          {sphere && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <span aria-hidden className={`h-2 w-2 rounded-full bg-current ${sphere.text}`} />
              {sphere.label}
            </span>
          )}
          {doneTime && (
            <span className="text-2xs font-medium tabular-nums text-text-muted">
              <span className="sr-only">Zrobione o </span>
              {doneTime}
            </span>
          )}
        </span>
      )}
    </Pressable>
  );
}
