import type { useHaptics } from '../../../hooks/useHaptics';
import { notify } from '../../../lib/notify';
import type { TablesUpdate } from '../../../lib/database.types';
import { appendStreamEntry } from '../../../lib/streamApi';
import {
  applyKpiRollup,
  currentWeekStart,
  fetchKpisForProject,
  rollupTaskCompletion,
  updateDailyWin,
  updateDailyWinTaskDone,
} from '../../../lib/goal/goalSpine';
import type { DailyWinWithTasks, DailyWinRecord } from '../usePowerListTypes';
import type { UsePowerListActionsArgs } from './usePowerListActionsTypes';

export async function toggleTaskHelper(
  args: UsePowerListActionsArgs,
  index: number,
  todayWinInput: DailyWinWithTasks | null,
  haptics: ReturnType<typeof useHaptics>,
  explicitDone?: boolean,
  explicitTimestamp?: string | null,
) {
  if (!todayWinInput) return;
  const todayWin = todayWinInput as DailyWinRecord;
  const slot = index + 1;
  const field = `done_${slot}`;
  const timeField = `completed_at_${slot}`;
  const todoIdField = `task_${slot}_todo_id`;
  const checkpointIdField = `task_${slot}_checkpoint_id`;
  const taskRow = (todayWin.daily_win_tasks ?? []).find((t) => t.slot === slot);
  const newValue = explicitDone !== undefined ? explicitDone : (taskRow ? !taskRow.done : !todayWin[field]);
  const timestamp = explicitTimestamp !== undefined ? explicitTimestamp : (newValue ? new Date().toISOString() : null);

  const allDone = [1, 2, 3, 4, 5].every((i) => {
    if (!todayWin[`task_${i}`]) return true;
    if (i === slot) return newValue;
    return todayWin[`done_${i}`];
  });

  const hasNote = Boolean(todayWin.day_note?.trim());
  const resultPatch: TablesUpdate<'daily_wins'> = {};
  // Rule: day is only closed as 'Z' if all tasks are done AND the user provided a day note!
  if (allDone && hasNote) {
    resultPatch.result = 'Z';
  } else if (!allDone && todayWin.result === 'Z') {
    resultPatch.result = null;
  }

  try {
    const taskRow = (todayWin.daily_win_tasks ?? []).find((t) => t.slot === slot);
    let data: Awaited<ReturnType<typeof updateDailyWin>>;

    if (taskRow) {
      await updateDailyWinTaskDone(args.userId, taskRow.id, newValue, timestamp);
      data = Object.keys(resultPatch).length > 0
        ? await updateDailyWin(args.userId, todayWin.id, resultPatch)
        : { ...todayWin, [field]: newValue, [timeField]: timestamp } as Awaited<ReturnType<typeof updateDailyWin>>;
    } else {
      // Legacy rows without daily_win_tasks — write wide columns directly.
      data = await updateDailyWin(args.userId, todayWin.id, {
        ...resultPatch,
        [field]: newValue,
        [timeField]: timestamp,
      } as TablesUpdate<'daily_wins'>);
    }

    // Prefer wide-column mirror after trigger fan-out; merge local done state for UI.
    const merged = {
      ...data,
      [field]: newValue,
      [timeField]: timestamp,
      daily_win_tasks: (todayWin.daily_win_tasks ?? []).map((t) =>
        t.slot === slot ? { ...t, done: newValue, completed_at: timestamp } : t,
      ),
    };

    if (args.onUpdate) args.onUpdate(merged as typeof data);

    if (newValue) {
      const taskText = todayWin[`task_${slot}`] as string | null;
      const category = (todayWin[`category_${slot}`] as string | null) ?? 'general';
      const checkpointId = todayWin[checkpointIdField] as string | null;
      if (checkpointId) {
        args.setCheckpointPrompt({
          index,
          checkpointId: checkpointId as string,
          title: taskText as string,
        });
      }
      if (taskText) {
        void appendStreamEntry({
          userId: args.userId,
          source: 'powerlist',
          content: `Powerlist ✓ [${category}]: ${taskText}`,
          metadata: {
            category,
            index: slot,
            todo_id: (todayWin[todoIdField] as string | null) ?? null,
            checkpoint_id: checkpointId ?? null,
            project_id: (todayWin[`task_${slot}_project_id`] as string | null) ?? null,
          },
        });
      }
    } else {
      args.setCheckpointPrompt((p) => (p?.index === index ? null : p));
    }

    const projectId = todayWin[`task_${slot}_project_id`] as string | null;
    const targetValue = todayWin[`task_${slot}_target_value`] as string | null;
    if (projectId && targetValue) {
      (async () => {
        try {
          const kpis = await fetchKpisForProject(args.userId, projectId);
          const preferredKpi =
            args.newTaskForm[index]?.kpiId ?? args.todaySlotKpis[index] ?? undefined;
          const decision = rollupTaskCompletion(
            targetValue,
            kpis,
            newValue ? 1 : -1,
            preferredKpi
          );
          if (decision) {
            await applyKpiRollup(args.userId, decision.kpiId, currentWeekStart(), decision.delta);
          }
        } catch (err: unknown) {
          console.error('[Action Error]', err);
          notify(err instanceof Error ? err.message : 'Wystąpił błąd', 'error');
        }
      })();
    }
    // todo_items sync: DB trigger sync_daily_win_tasks_to_todo (when todo_id set)
    return merged as DailyWinWithTasks;
  } catch (err: unknown) {
    console.error('[PowerList] toggleTask failed', err);
    notify('Nie udało się zapisać zadania.', 'error');
    throw err;
  }
}
