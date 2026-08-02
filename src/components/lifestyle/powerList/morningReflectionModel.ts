import type { Tables, TablesUpdate } from '../../../lib/database.types';

interface BuildMorningReflectionRecordArgs {
  date: string;
  note: string;
  dayScore: number;
  moodScore: number;
}

export function buildMorningReflectionRecord({
  date,
  note,
  dayScore,
  moodScore,
}: BuildMorningReflectionRecordArgs) {
  const dailyWinPatch: TablesUpdate<'daily_wins'> = {
    day_note: note.trim(),
    mood_score: moodScore,
  };

  return {
    date,
    dailyWinPatch,
    dayScore,
  };
}

type YesterdayTaskState = Pick<Tables<'daily_win_tasks'>, 'id' | 'done' | 'completed_at'>;

interface YesterdayTaskContainer<TTask extends YesterdayTaskState> {
  daily_win_tasks?: TTask[];
}

export function applyYesterdayTaskToggle<
  TTask extends YesterdayTaskState,
  TWin extends YesterdayTaskContainer<TTask>,
>(
  win: TWin,
  taskId: string,
  done: boolean,
  completedAt: string | null,
): TWin {
  return {
    ...win,
    daily_win_tasks: (win.daily_win_tasks ?? []).map((task) => (
      task.id === taskId
        ? { ...task, done, completed_at: completedAt }
        : task
    )),
  };
}
