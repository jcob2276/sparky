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
import type { DailyWinWithTasks } from '../usePowerListTypes';
import { applyTodayTaskToggle } from '../powerList/morningReflectionModel';
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
  const todayWin = todayWinInput;
  const slot = index + 1;
  const taskRow = (todayWin.daily_win_tasks ?? []).find((t) => t.slot === slot);
  if (!taskRow) throw new Error('Nie znaleziono zadania dnia.');
  const newValue = explicitDone !== undefined ? explicitDone : !taskRow.done;
  const timestamp = explicitTimestamp !== undefined ? explicitTimestamp : (newValue ? new Date().toISOString() : null);

  const allDone = (todayWin.daily_win_tasks ?? []).every(task => !task.title || (task.slot === slot ? newValue : task.done));

  const hasNote = Boolean(todayWin.day_note?.trim());
  const resultPatch: TablesUpdate<'daily_wins'> = {};
  // Rule: day is only closed as 'Z' if all tasks are done AND the user provided a day note!
  if (allDone && hasNote) {
    resultPatch.result = 'Z';
  } else if (!allDone && todayWin.result === 'Z') {
    resultPatch.result = null;
  }

  try {
    await updateDailyWinTaskDone(args.userId, taskRow.id, newValue, timestamp);
    const data = Object.keys(resultPatch).length > 0
      ? await updateDailyWin(args.userId, todayWin.id, resultPatch) : todayWin;
    const merged = applyTodayTaskToggle({ ...data, daily_win_tasks: todayWin.daily_win_tasks }, slot, newValue, timestamp);

    if (args.onUpdate) args.onUpdate(merged);

    if (newValue) {
      const taskText = taskRow.title;
      const category = taskRow.category ?? 'general';
      const checkpointId = taskRow.checkpoint_id;
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
            todo_id: taskRow.todo_id,
            checkpoint_id: checkpointId ?? null,
            project_id: taskRow.project_id,
          },
        });
      }
    } else {
      args.setCheckpointPrompt((p) => (p?.index === index ? null : p));
    }

    const projectId = taskRow.project_id;
    const targetValue = taskRow.target_value;
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
