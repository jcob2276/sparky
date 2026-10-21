import { Pressable } from '../../ui/ControlPrimitives';
import { SPHERE_SLOTS } from './powerListConstants';
import PowerListTask from '../PowerListTask';

import { type DailyWinWithTasks } from '../usePowerListData';
import type { Tables } from '../../../lib/database.types';

interface PowerListActiveProps {
  checkpointPrompt: { index: number; checkpointId: string; title: string } | null;
  setCheckpointPrompt: (v: { index: number; checkpointId: string; title: string } | null) => void;
  markingCheckpoint: boolean;
  confirmCheckpointDone: () => Promise<void>;
  todayWin: DailyWinWithTasks;
  projectMap: Record<string, { name: string; color: string | null }>;
  toggleTask: (index: number) => void;
  eveningCloseDue: boolean;
  onOpenShutdown?: () => void;
}

export default function PowerListActive({
  checkpointPrompt,
  setCheckpointPrompt,
  markingCheckpoint,
  confirmCheckpointDone,
  todayWin,
  projectMap,
  toggleTask,
  eveningCloseDue,
  onOpenShutdown,
}: PowerListActiveProps) {
  const tasks = todayWin.daily_win_tasks || [];
  const allDone = tasks.length > 0 && tasks.every((t: Tables<'daily_win_tasks'>) => t.done);
  const hasDayNote = Boolean(todayWin.day_note?.trim());
  const showClosePrompt = !hasDayNote && (allDone || eveningCloseDue) && Boolean(onOpenShutdown);

  return (
    <div className="space-y-3">
      {checkpointPrompt && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/[0.06] px-3.5 py-2.5 animate-fadeIn">
          <p className="text-xs font-semibold text-text-primary leading-snug min-w-0">
            Checkpoint: <span className="font-bold">{checkpointPrompt.title}</span> — oznaczyć jako done?
          </p>
          <div className="flex shrink-0 gap-1.5">
            <Pressable
              type="button"
              onClick={() => void confirmCheckpointDone()}
              disabled={markingCheckpoint}
              className="rounded-lg bg-success px-2.5 py-1 text-2xs font-black uppercase text-on-accent hover:bg-success-hover disabled:opacity-[var(--opacity-50)] cursor-pointer"
            >
              Tak
            </Pressable>
            <Pressable
              type="button"
              onClick={() => setCheckpointPrompt(null)}
              className="rounded-lg border border-border-custom px-2.5 py-1 text-2xs font-black uppercase text-text-muted hover:text-text-primary cursor-pointer"
            >
              Nie
            </Pressable>
          </div>
        </div>
      )}

      <div className="divide-y divide-border-custom/60 overflow-hidden rounded-2xl border border-border-custom bg-surface">
        {[...(todayWin.daily_win_tasks || [])]
          .sort((a: Tables<'daily_win_tasks'>, b: Tables<'daily_win_tasks'>) => a.slot - b.slot)
          .map((t: Tables<'daily_win_tasks'>) => {
            const sphere = t.slot <= 3 ? SPHERE_SLOTS[t.slot - 1] : null;
            return (
              <PowerListTask
                key={t.id}
                index={t.slot - 1}
                task={t.title}
                done={t.done ?? false}
                completedAt={t.completed_at}
                linkedTodoId={t.todo_id}
                linkedProjectId={t.project_id}
                projectMap={projectMap}
                toggleTask={toggleTask}
                sphere={sphere}
                targetValue={t.target_value}
                timeSlot={t.time_slot as 'morning' | 'noon' | 'afternoon' | 'evening' | null}
              />
            );
          })}
      </div>

      {showClosePrompt && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-surface/90 px-3.5 py-3 shadow-sm animate-fadeIn">
          <div className="min-w-0">
            <p className="text-2xs font-black uppercase tracking-wider text-primary">
              {allDone ? 'Komplet zadań' : 'Wieczorne domknięcie dnia'}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-text-secondary">Liczby sprzedaży, notatka i ocena dnia.</p>
          </div>
          <Pressable
            type="button"
            onClick={onOpenShutdown}
            className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-black uppercase tracking-wider text-on-accent transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
          >
            Domknij dzień
          </Pressable>
        </div>
      )}

      {hasDayNote && (
        <div className="rounded-xl border border-border-custom/60 bg-surface/40 px-3.5 py-2 space-y-0.5">
          <p className="text-3xs font-black uppercase tracking-wider text-text-muted">
            Domknięcie dnia {todayWin.result ? `(${todayWin.result === 'Z' ? 'Wygrana Z' : 'P'})` : ''}
          </p>
          <p className="text-xs text-text-secondary italic">
            „{todayWin.day_note!.trim()}”
          </p>
        </div>
      )}
    </div>
  );
}
