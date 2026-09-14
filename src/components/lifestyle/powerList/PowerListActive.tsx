import { Trophy } from 'lucide-react';
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
  eveningNote: string;
  setEveningNote: (v: string) => void;
  savingEvening: boolean;
  saveEveningClose: () => Promise<void>;
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
  eveningNote,
  setEveningNote,
  savingEvening,
  saveEveningClose,
}: PowerListActiveProps) {
  const tasks = todayWin.daily_win_tasks || [];
  const allDone = tasks.length > 0 && tasks.every((t: Tables<'daily_win_tasks'>) => t.done);
  const hasDayNote = Boolean(todayWin.day_note?.trim());
  const showClosePrompt = !hasDayNote && (allDone || eveningCloseDue);

  return (
    <div className="space-y-2.5">
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

      {allDone && todayWin.result === 'Z' && (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-gradient-to-r from-success/15 via-surface to-success/5 p-4 shadow-2xs animate-fadeIn">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/20 text-success border border-success/30 shadow-xs">
            <Trophy size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-success">
              Wszystkie 5 zwycięstw zdobyte! Dzień wygrany (Z).
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Dzień oficjalnie domknięty i przypieczętowany notatką.
            </p>
          </div>
        </div>
      )}

      {(todayWin.daily_win_tasks || [])
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

      {showClosePrompt && (
        <div className="rounded-2xl border border-primary/30 bg-surface/90 p-3.5 space-y-2.5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-primary">
              {allDone ? 'Komplet zadań — domknij dzień' : 'Wieczorne domknięcie dnia'}
            </span>
            <span className="text-3xs font-semibold text-text-muted">
              Wymagana notatka
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-snug">
            {allDone
              ? 'Wszystkie zadania dowiezione! Aby formalnie zamknąć i zapisać wygrany dzień (Z), dodaj krótką notatkę.'
              : 'Dzień nie zamyka się samoczynnie — wpisz krótką notatkę refleksyjną, aby zapisać domknięcie.'}
          </p>
          <textarea
            value={eveningNote}
            onChange={(e) => setEveningNote(e.target.value)}
            placeholder="Krótka notatka ze strony Jakuba (fakty, tarcie, co poszło dobrze)..."
            rows={2}
            className="w-full rounded-xl border border-border-custom bg-background/60 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none resize-none transition-colors"
          />
          <div className="flex justify-end">
            <Pressable
              type="button"
              onClick={() => void saveEveningClose()}
              disabled={savingEvening || !eveningNote.trim()}
              className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              {savingEvening ? 'Zamykam dzień…' : allDone ? 'Zamknij wygrany dzień (Z)' : 'Zamknij dzień notatką'}
            </Pressable>
          </div>
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
