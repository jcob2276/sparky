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

export function applyTodayTaskToggle<TWin extends Record<string, unknown>>(
  win: TWin,
  slot: number,
  done: boolean,
  completedAt: string | null,
): TWin {
  const field = `done_${slot}`;
  const timeField = `completed_at_${slot}`;
  const rawTasks = Array.isArray(win.daily_win_tasks) ? win.daily_win_tasks : [];
  const tasks = rawTasks.map((task: unknown) =>
    (task as { slot?: number }).slot === slot
      ? { ...(task as Record<string, unknown>), done, completed_at: completedAt }
      : task,
  );

  const allDone = [1, 2, 3, 4, 5].every((i) => {
    if (i === slot) return done;
    const task = tasks.find((t: unknown) => (t as { slot?: number }).slot === i);
    if (task) return Boolean((task as { done?: boolean }).done);
    return Boolean(win[`done_${i}`]);
  });

  const hasNote = Boolean((win.day_note as string | undefined)?.trim());
  let result = win.result;
  if (allDone && hasNote) {
    result = 'Z';
  } else if (!allDone && win.result === 'Z') {
    result = null;
  }

  return {
    ...win,
    result,
    [field]: done,
    [timeField]: completedAt,
    daily_win_tasks: tasks,
  };
}
