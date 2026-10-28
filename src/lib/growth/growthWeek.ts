import { shiftWeekStart } from '../date';

export interface WeekDirectionGoals {
  intention: string | null;
  commitment: string | null;
  cialo: string | null;
  duch: string | null;
  konto: string | null;
}

export interface PowerListWeekStats {
  daysLogged: number;
  daysWithWins: number;
  tasksDone: number;
  tasksSet: number;
}

export function getWeekEndExclusive(weekStart: string): string {
  return shiftWeekStart(weekStart, 1);
}

export function computePowerListWeekStats(
  rows: Array<{
    daily_win_tasks?: Array<{ slot: number; title: string | null; done: boolean | null }> | null;
  }>,
): PowerListWeekStats {
  let daysWithWins = 0;
  let tasksDone = 0;
  let tasksSet = 0;

  for (const row of rows) {
    let dayDone = 0;
    for (const t of row.daily_win_tasks ?? []) {
      if (!t.title?.trim()) continue;
      tasksSet++;
      if (t.done) {
        tasksDone++;
        dayDone++;
      }
    }
    if (dayDone > 0) daysWithWins++;
  }

  return { daysLogged: rows.length, daysWithWins, tasksDone, tasksSet };
}
