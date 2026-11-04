import { useQuery } from '@tanstack/react-query';
import { fetchDailyWinTasks } from './dailyWinTasksApi';
import { getTodayWarsaw, getWeekStartWarsaw, shiftDateStr } from './date';

export interface WinsHistoryDay {
  date: string;
  /** Liczba ukończonych zadań z planu dnia. */
  done: number;
  /** Liczba zaplanowanych zadań; 0 oznacza brak planu (brak danych, nie porażkę). */
  planned: number;
  future: boolean;
}

const SLOTS = [1, 2, 3, 4, 5] as const;

/** Zlicza zadania i ukończenia z jednego wiersza dnia (sloty task_1…task_5, done_1…done_5). */
export function countWinsDay(row: Record<string, unknown> | undefined): { done: number; planned: number } {
  if (!row) return { done: 0, planned: 0 };
  let done = 0;
  let planned = 0;
  for (const slot of SLOTS) {
    const title = row[`task_${slot}`];
    if (typeof title === 'string' && title.trim()) {
      planned += 1;
      if (row[`done_${slot}`] === true) done += 1;
    }
  }
  return { done, planned };
}

/** Dni od poniedziałku najstarszego tygodnia do niedzieli bieżącego, z danymi z planu. */
export function buildWinsHistory(today: string, weeks: number, rows: Array<Record<string, unknown> & { date: string }>): WinsHistoryDay[][] {
  const byDate = new Map(rows.map(row => [row.date, row]));
  const start = shiftDateStr(getWeekStartWarsaw(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const date = shiftDateStr(start, w * 7 + d);
    return { date, ...countWinsDay(byDate.get(date)), future: date > today };
  }));
}

export function useWinsHistory(userId: string, weeks = 8) {
  const today = getTodayWarsaw();
  const from = shiftDateStr(getWeekStartWarsaw(today), -7 * (weeks - 1));
  return useQuery({
    queryKey: ['wins-history', userId, from, weeks],
    queryFn: async () => {
      const result = await fetchDailyWinTasks(userId, { from, to: today, ascending: true });
      if (result.error) throw new Error(result.error.message);
      const rows = (result.data ?? []).filter((row): row is typeof row & { date: string } => typeof row.date === 'string');
      return buildWinsHistory(today, weeks, rows);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
