import type { DailyWinRow, DailyWinUpdate, DailyWinInsert } from './goalSpine.types';
import { invalidateGoalSpineCache } from './goalSpine.queries';
import { persistDailyWin, persistDailyWinMetadata, persistDailyWinTaskDone } from '../dailyWinTasksApi';

export * from './goalSpineKpi.mutations';

/** Canonical write path for daily_wins — invalidates spine cache for SpineGuideStrip / dashboard. */
export async function updateDailyWin(
  userId: string,
  id: string,
  patch: DailyWinUpdate,
): Promise<DailyWinRow> {
  const data = await persistDailyWinMetadata(userId, id, patch);
  invalidateGoalSpineCache(userId);
  return data;
}

/** Toggle a Power List slot via daily_win_tasks (source of truth for task done state). */
export async function updateDailyWinTaskDone(
  userId: string,
  taskId: string,
  done: boolean,
  completedAt: string | null,
): Promise<void> {
  await persistDailyWinTaskDone(userId, taskId, done, completedAt);
  invalidateGoalSpineCache(userId);
}

export async function insertDailyWin(
  userId: string,
  entry: DailyWinInsert,
): Promise<DailyWinRow> {
  const data = await persistDailyWin(userId, entry);
  invalidateGoalSpineCache(userId);
  return data;
}
