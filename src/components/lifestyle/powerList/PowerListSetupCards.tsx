import { Check, CheckCircle2, LoaderCircle, MessageCircleQuestion } from 'lucide-react';
import { ControlTextarea, Pressable } from '../../ui/ControlPrimitives';
import { GroupedList, GroupedListRow } from '../../ui/GroupedList';
import DailyScorePicker from '../../shared/DailyScorePicker';
import type { Tables } from '../../../lib/database.types';

type YesterdayRecapTask = Pick<Tables<'daily_win_tasks'>, 'id' | 'title' | 'done'>;

interface RecapProps {
  yesterdayWin: { date: string | null; daily_win_tasks?: YesterdayRecapTask[] } | null;
  yesterdayNote: string;
  setYesterdayNote: (value: string) => void;
  yesterdayNoteRequired: boolean;
  dayScore: number;
  setDayScore: (value: number) => void;
  moodScore: number;
  setMoodScore: (value: number) => void;
  onToggleYesterdayTask: (taskId: string) => void;
  savingYesterdayTaskIds: ReadonlySet<string>;
}

export function YesterdayRecap({
  yesterdayWin,
  yesterdayNote,
  setYesterdayNote,
  yesterdayNoteRequired,
  dayScore,
  setDayScore,
  moodScore,
  setMoodScore,
  onToggleYesterdayTask,
  savingYesterdayTaskIds,
}: RecapProps) {
  if (!yesterdayWin) return null;
  const ready = !yesterdayNoteRequired || Boolean(yesterdayNote.trim());

  return (
    <section className="space-y-3" aria-labelledby="yesterday-recap-title">
      <header className="flex items-start justify-between gap-3 px-1">
        <div>
          <p className="ios-section-label">Refleksja · {yesterdayWin.date}</p>
          <h3 id="yesterday-recap-title" className="mt-1 text-lg font-semibold tracking-tight text-text-primary">
            Co zadziałało, a co przeszkodziło?
          </h3>
        </div>
        {ready ? (
          <CheckCircle2 size={19} className="shrink-0 text-success" aria-hidden="true" />
        ) : (
          <MessageCircleQuestion size={19} className="shrink-0 text-direction" aria-hidden="true" />
        )}
      </header>

      <GroupedList aria-label="Zadania z wczoraj">
        {(yesterdayWin.daily_win_tasks || []).map((task) => {
          const saving = savingYesterdayTaskIds.has(task.id);
          return (
            <GroupedListRow key={task.id} className="p-0">
              <Pressable
                aria-label={`${task.done ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}: ${task.title}`}
                aria-pressed={Boolean(task.done)}
                disabled={saving}
                onClick={() => onToggleYesterdayTask(task.id)}
                className="group flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium"
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${task.done ? 'border-success bg-success text-on-accent' : 'border-text-muted bg-surface-solid text-transparent group-hover:border-primary'}`}>
                  {saving ? (
                    <LoaderCircle size={13} className="animate-spin text-text-muted" />
                  ) : task.done ? (
                    <Check size={13} strokeWidth={3} />
                  ) : null}
                </span>
                <span className={task.done ? 'text-text-secondary line-through' : 'text-text-primary'}>
                  {task.title}
                </span>
              </Pressable>
            </GroupedListRow>
          );
        })}

        <GroupedListRow className="py-4">
          <label htmlFor="yesterday-reflection" className="block text-sm font-medium text-text-secondary">
            Jedno szczere zdanie wystarczy.
            {yesterdayNoteRequired && <span className="ml-1 font-semibold text-direction">Wymagane</span>}
          </label>
          <ControlTextarea
            id="yesterday-reflection"
            value={yesterdayNote}
            onChange={(event) => setYesterdayNote(event.target.value)}
            placeholder="Co pomogło lub zatrzymało realizację?"
            rows={3}
            className="ui-input mt-3 min-h-24 w-full resize-y px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
          />
        </GroupedListRow>

        <GroupedListRow className="ui-recap-score-row" inset={false}>
          <DailyScorePicker
            dayScore={dayScore}
            setDayScore={setDayScore}
            moodScore={moodScore}
            setMoodScore={setMoodScore}
          />
        </GroupedListRow>
      </GroupedList>
    </section>
  );
}
