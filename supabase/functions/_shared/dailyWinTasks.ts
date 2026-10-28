/**
 * Sloty zadań dnia z daily_win_tasks (wiersze) w dotychczasowym kształcie kolumn daily_wins (task_N, done_N, ...).
 * Czytelnicy pobierają `daily_win_tasks(...)` jako zagnieżdżenie i owijają wynik w withLegacySlots, więc logika
 * promptów i podsumowań nie zmienia się, a kolumny slotów w daily_wins przestają być potrzebne.
 */
export const DAILY_WIN_TASK_COLUMNS =
  "slot, title, done, category, completed_at, todo_id, checkpoint_id, pin_id, project_id, target_value, time_slot";

export interface DailyWinTaskRow {
  slot: number;
  title: string | null;
  done: boolean | null;
  category: string | null;
  completed_at: string | null;
  todo_id: string | null;
  checkpoint_id: string | null;
  pin_id: string | null;
  project_id: string | null;
  target_value: string | null;
  time_slot: string | null;
}

export type LegacySlots = Record<string, string | boolean | null>;

/** Kolumny slotów 1-5 w kształcie daily_wins; brakujący slot daje null (jak pusta kolumna). */
export function legacySlotsFromTasks(tasks: DailyWinTaskRow[] | null | undefined): LegacySlots {
  const bySlot = new Map((tasks ?? []).map((task) => [task.slot, task]));
  const out: LegacySlots = {};
  for (let n = 1; n <= 5; n++) {
    const task = bySlot.get(n);
    out[`task_${n}`] = task?.title ?? null;
    out[`done_${n}`] = task ? task.done : null;
    out[`category_${n}`] = task?.category ?? null;
    out[`completed_at_${n}`] = task?.completed_at ?? null;
    out[`task_${n}_todo_id`] = task?.todo_id ?? null;
    out[`task_${n}_checkpoint_id`] = task?.checkpoint_id ?? null;
    out[`task_${n}_pin_id`] = task?.pin_id ?? null;
    out[`task_${n}_project_id`] = task?.project_id ?? null;
    out[`task_${n}_target_value`] = task?.target_value ?? null;
    out[`task_${n}_time_slot`] = task?.time_slot ?? null;
  }
  return out;
}

/** Wiersz dnia z zagnieżdżonym daily_win_tasks, uzupełniony o kolumny slotów w dotychczasowym kształcie. */
export function withLegacySlots<T extends { daily_win_tasks?: DailyWinTaskRow[] | null }>(
  win: T,
): Omit<T, "daily_win_tasks"> & LegacySlots {
  const { daily_win_tasks: tasks, ...rest } = win;
  return { ...rest, ...legacySlotsFromTasks(tasks) };
}
