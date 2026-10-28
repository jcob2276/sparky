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

export function applyTodayTaskToggle<TWin extends {
  daily_win_tasks?: Array<{ slot: number; title: string; done: boolean | null; completed_at: string | null }>;
  day_note?: string | null;
  result?: string | null;
}>(
  win: TWin,
  slot: number,
  done: boolean,
  completedAt: string | null,
): TWin {
  const tasks = (win.daily_win_tasks ?? []).map(task =>
    task.slot === slot
      ? { ...task, done, completed_at: completedAt }
      : task,
  );

  const activeTasks = tasks.filter(task => task.title.trim());
  const allDone = activeTasks.length > 0 && activeTasks.every(task => task.done);

  const hasNote = Boolean(win.day_note?.trim());
  let result = win.result;
  if (allDone && hasNote) {
    result = 'Z';
  } else if (!allDone && win.result === 'Z') {
    result = null;
  }

  return {
    ...win,
    result,
    daily_win_tasks: tasks,
  };
}
