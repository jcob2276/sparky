import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { fetchDailyWinTasks } from './dailyWinTasksApi';
import { getTodayWarsaw, shiftDateStr } from './date';

export type WinsTask = {
  slot: number;
  title: string;
  done: boolean;
  /** Raw category slug from the plan (cialo, duch, konto, general). */
  category: string | null;
};

export type WinsDayCell = {
  date: string;
  label: string;
  result: 'Z' | 'P' | null;
  doneCount: number;
  plannedCount: number;
  status: 'win' | 'loss' | 'open';
  /** The user's own 1–10 rating of the day (evening shutdown), when given. */
  score: number | null;
  /** The user's one-line opinion of the day. */
  note: string | null;
  tasks: WinsTask[];
};

const WEEKDAY_PL = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'] as const;

function weekdayLabel(dateStr: string): string {
  const day = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return WEEKDAY_PL[day] ?? '';
}

type TaskRow = {
  task_1?: string | null; task_2?: string | null; task_3?: string | null; task_4?: string | null; task_5?: string | null;
  category_1?: string | null; category_2?: string | null; category_3?: string | null; category_4?: string | null; category_5?: string | null;
  done_1?: boolean | null; done_2?: boolean | null; done_3?: boolean | null; done_4?: boolean | null; done_5?: boolean | null;
};

function collectTasks(row: TaskRow | undefined): WinsTask[] {
  if (!row) return [];
  const slots: Array<[string | null | undefined, boolean | null | undefined, string | null | undefined]> = [
    [row.task_1, row.done_1, row.category_1], [row.task_2, row.done_2, row.category_2],
    [row.task_3, row.done_3, row.category_3], [row.task_4, row.done_4, row.category_4],
    [row.task_5, row.done_5, row.category_5],
  ];
  return slots.flatMap(([title, done, category], index) =>
    title && title.trim()
      ? [{ slot: index + 1, title: title.trim(), done: Boolean(done), category: category?.trim() || null }]
      : [],
  );
}

export function buildWeeklyWinsMap(input: {
  today: string;
  /** Day ratings by date (`daily_reconciliations.day_score`). */
  scores?: Record<string, number | null | undefined>;
  rows: Array<{
    date: string;
    result: string | null;
    day_note?: string | null;
    category_1?: string | null;
    category_2?: string | null;
    category_3?: string | null;
    category_4?: string | null;
    category_5?: string | null;
    task_1?: string | null;
    task_2?: string | null;
    task_3?: string | null;
    task_4?: string | null;
    task_5?: string | null;
    done_1?: boolean | null;
    done_2?: boolean | null;
    done_3?: boolean | null;
    done_4?: boolean | null;
    done_5?: boolean | null;
  }>;
}): WinsDayCell[] {
  const byDate = new Map(input.rows.map((row) => [row.date, row]));
  const days: WinsDayCell[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = shiftDateStr(input.today, -i);
    const row = byDate.get(date);
    const tasks = [row?.task_1, row?.task_2, row?.task_3, row?.task_4, row?.task_5];
    const dones = [row?.done_1, row?.done_2, row?.done_3, row?.done_4, row?.done_5];
    const plannedCount = tasks.filter((t) => Boolean(t && String(t).trim())).length;
    const doneCount = dones.filter(Boolean).length;
    const result = row?.result === 'Z' || row?.result === 'P' ? row.result : null;
    const isWin = result === 'Z' || (plannedCount === 5 && doneCount === 5);

    let status: WinsDayCell['status'];
    if (isWin) status = 'win';
    else if (date === input.today) status = 'open';
    else status = 'loss';

    days.push({
      date,
      label: weekdayLabel(date),
      result,
      doneCount,
      plannedCount,
      status,
      score: input.scores?.[date] ?? null,
      note: row?.day_note?.trim() || null,
      tasks: collectTasks(row),
    });
  }

  return days;
}

export function useWeeklyWinsMap(userId: string) {
  const today = getTodayWarsaw();
  const since = shiftDateStr(today, -6);
  return useQuery({
    queryKey: ['weekly-wins-map', userId, since],
    queryFn: async () => {
      const [winsRes, scoresRes] = await Promise.all([
        fetchDailyWinTasks(userId, { from: since, to: today, ascending: true }),
        supabase
          .from('daily_reconciliations')
          .select('date, day_score')
          .eq('user_id', userId)
          .gte('date', since)
          .lte('date', today),
      ]);
      if (winsRes.error) throw new Error(winsRes.error.message);
      // A missing rating must not hide the day: scores are optional extra detail.
      const scores: Record<string, number | null> = {};
      for (const row of scoresRes.data ?? []) {
        if (typeof row.date === 'string') scores[row.date] = row.day_score;
      }
      const rows = (winsRes.data ?? []).filter((r): r is typeof r & { date: string } => typeof r.date === 'string');
      return buildWeeklyWinsMap({ today, rows, scores });
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
