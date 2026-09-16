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
    done_1?: boolean | null;
    done_2?: boolean | null;
    done_3?: boolean | null;
    done_4?: boolean | null;
    done_5?: boolean | null;
    task_1?: string | null;
    task_2?: string | null;
    task_3?: string | null;
    task_4?: string | null;
    task_5?: string | null;
  }>,
): PowerListWeekStats {
  let daysWithWins = 0;
  let tasksDone = 0;
  let tasksSet = 0;

  for (const row of rows) {
    let dayDone = 0;
    if (row.daily_win_tasks?.length) {
      for (const t of row.daily_win_tasks) {
        if (!t.title?.trim()) continue;
        tasksSet++;
        if (t.done) {
          tasksDone++;
          dayDone++;
        }
      }
    } else {
      for (let i = 1; i <= 5; i++) {
        const task = row[`task_${i}` as keyof typeof row] as string | null | undefined;
        const done = row[`done_${i}` as keyof typeof row] as boolean | null | undefined;
        if (task?.trim()) {
          tasksSet++;
          if (done) {
            tasksDone++;
            dayDone++;
          }
        }
      }
    }
    if (dayDone > 0) daysWithWins++;
  }

  return { daysLogged: rows.length, daysWithWins, tasksDone, tasksSet };
}
