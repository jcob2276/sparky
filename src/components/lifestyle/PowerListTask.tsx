import { Pressable } from '../ui/ControlPrimitives';
import { Check, Link2 } from 'lucide-react';
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
  targetValue: _targetValue,
}: PowerListTaskProps) {
  const SphereIcon = sphere?.icon;

  const linkedProject = linkedTodoId
    ? projectMap[linkedTodoId]
    : linkedProjectId
    ? projectMap[`task_project_${index + 1}`]
    : null;

  return (
    <Pressable
      onClick={() => toggleTask(index)}
      className={`group flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-95 shadow-2xs ${
        done
          ? 'border-border-custom/50 bg-surface/20 opacity-[var(--opacity-60)] shadow-none'
          : 'border-border-custom/80 bg-surface hover:border-primary/30 hover:bg-surface-solid/80 hover:shadow-xs'
      }`}
    >
      <div className="pt-0.5 shrink-0">
        <div
          className={`flex h-5.5 w-5.5 items-center justify-center rounded-full border transition-all ${
            done
              ? 'border-dayC bg-dayC text-on-accent shadow-2xs scale-100'
              : 'border-border-custom bg-surface-solid/80 text-transparent scale-95 group-hover:border-primary/50 group-active:scale-90'
          }`}
        >
          <Check
            size={11}
            strokeWidth={3}
            className={`transition-transform ${done ? 'scale-100' : 'scale-0'}`}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sphere && SphereIcon && (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-3xs font-black uppercase tracking-wider ${sphere.bg} ${sphere.text} border ${sphere.border || 'border-transparent'}`}
            >
              <SphereIcon size={8} />
              <span>{sphere.label}</span>
            </span>
          )}
          <span
            className={`text-sm font-semibold tracking-normal transition-all ${
              done ? 'text-text-muted line-through opacity-[var(--opacity-70)]' : 'text-text-primary'
            }`}
          >
            {task}
          </span>
        </div>

        {linkedProject && (
          <p className="mt-1 flex items-center gap-1.5 text-2xs font-medium text-text-muted truncate">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                COLOR_DOT[linkedProject.color || ''] || 'bg-primary'
              }`}
            />
            <span className="truncate">{linkedProject.name}</span>
          </p>
        )}

        {!linkedProject && linkedTodoId && !done && (
          <p className="mt-1 flex items-center gap-1 text-2xs font-medium text-text-muted">
            <Link2 size={10} className="shrink-0 text-primary" />
            <span>Połączone zadanie</span>
          </p>
        )}

        {done && completedAt && (
          <p className="mt-1 text-2xs font-medium text-text-muted/70">
            Zrobione o{' '}
            {new Date(completedAt).toLocaleTimeString('pl-PL', {
              timeZone: TIMEZONE,
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </Pressable>
  );
}
