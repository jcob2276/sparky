import { useHaptics } from '../../../hooks/useHaptics';
import { notify } from '../../../lib/notify';
import { markCheckpointDone } from '../../../lib/checkpoints';
import { appendStreamEntry } from '../../../lib/streamApi';
import { updateDailyWin } from '../../../lib/goal/goalSpine';
import type { TaskSlot, DailyWinWithTasks, DailyWinRecord } from '../usePowerListTypes';
import type { UsePowerListActionsArgs } from './usePowerListActionsTypes';
import { toggleTaskHelper } from './powerListToggleTask';
import { startNewDayHelper } from './powerListStartNewDay';
import { updateSlotHelper } from './powerListUpdateSlot';
import {
  projectOptionsForSlotHelper,
  kpiHintForSlotHelper,
  kpisForProjectHelper,
} from './powerListSlotOptions';

export function usePowerListActions(args: UsePowerListActionsArgs) {
  const haptics = useHaptics();

  return {
    fillSlotFromCheckpoint: (payload: { title: string; checkpointId: string; projectId: string }, slotIndex?: number) =>
      fillSlotFromCheckpointHelper(payload, slotIndex, args.newTaskForm, args.setNewTaskForm, haptics),
    confirmCheckpointDone: () => confirmCheckpointDoneHelper(args),
    saveEveningClose: (win: DailyWinWithTasks | null) => saveEveningCloseHelper(args, win, haptics),
    toggleTask: (idx: number, win: DailyWinWithTasks | null, explicitDone?: boolean, explicitTimestamp?: string | null): Promise<DailyWinWithTasks | undefined> =>
      toggleTaskHelper(args, idx, win, haptics, explicitDone, explicitTimestamp),
    startNewDay: () => startNewDayHelper(args, haptics),
    updateSlot: (i: number, patch: Partial<TaskSlot>) => updateSlotHelper(args, i, patch),
    projectOptionsForSlot: (slotIndex: number) =>
      projectOptionsForSlotHelper(slotIndex, args.pillarProjects, args.allProjectOptions),
    kpiHintForSlot: (slotIndex: number, projectId: string | null, kpiId?: string | null) =>
      kpiHintForSlotHelper(slotIndex, projectId, kpiId, args.pillarProjects, args.allProjectOptions),
    kpisForProject: (projectId: string | null) =>
      kpisForProjectHelper(projectId, args.pillarProjects, args.allProjectOptions),
  };
}

function fillSlotFromCheckpointHelper(
  payload: { title: string; checkpointId: string; projectId: string },
  slotIndex: number | undefined,
  newTaskForm: TaskSlot[],
  setNewTaskForm: React.Dispatch<React.SetStateAction<TaskSlot[]>>,
  haptics: ReturnType<typeof useHaptics>
) {
  const idx = slotIndex ?? newTaskForm.findIndex((s) => !s.task.trim());
  if (idx < 0 || idx > 4) return;
  setNewTaskForm((prev) => {
    const next = [...prev];
    next[idx] = {
      task: payload.title,
      todoId: null,
      checkpointId: payload.checkpointId,
      projectId: payload.projectId,
      pinId: null,
      targetValue: next[idx].targetValue ?? '',
      timeSlot: next[idx].timeSlot ?? 'morning',
    };
    return next;
  });
  haptics.light();
}

async function confirmCheckpointDoneHelper(args: UsePowerListActionsArgs) {
  if (!args.checkpointPrompt) return;
  args.setMarkingCheckpoint(true);
  try {
    await markCheckpointDone(args.checkpointPrompt.checkpointId);
    notify('Checkpoint zamknięty', 'success');
    args.setCheckpointPrompt(null);
    void args.direction.reload();
  } catch (err: unknown) {
    notify(err instanceof Error ? (err as Error).message : 'Błąd', 'error');
  } finally {
    args.setMarkingCheckpoint(false);
  }
}

async function saveEveningCloseHelper(args: UsePowerListActionsArgs, todayWin: DailyWinWithTasks | null, haptics: ReturnType<typeof useHaptics>) {
  if (!todayWin || !args.eveningNote.trim() || args.savingEvening) return;
  args.setSavingEvening(true);
  try {
    const note = args.eveningNote.trim();
    const winRecord = todayWin as unknown as DailyWinRecord;
    const tasks = todayWin.daily_win_tasks || [];
    const allDone = tasks.length > 0
      ? tasks.every((t) => t.done)
      : [1, 2, 3, 4, 5].every((i) => {
          if (!winRecord[`task_${i}`]) return true;
          return winRecord[`done_${i}`];
        });
    const result: 'Z' | 'P' = allDone ? 'Z' : 'P';
    const data = await updateDailyWin(args.userId, todayWin.id, {
      day_note: note,
      result,
    });
    void appendStreamEntry({
      userId: args.userId,
      source: 'powerlist',
      content: `Domknięcie dnia (${result === 'Z' ? 'WYGRANA Z' : 'P'}): ${note}`,
      metadata: { kind: 'day_close', date: args.today, result },
    });
    haptics.success();
    notify(result === 'Z' ? 'Dzień zamknięty z wygraną (Z)!' : 'Dzień domknięty notatką.', 'success');
    if (args.onUpdate) args.onUpdate(data);
  } catch (err: unknown) {
    console.error('[saveEveningClose]', err);
    notify('Nie udało się zapisać domknięcia dnia.', 'error');
  } finally {
    args.setSavingEvening(false);
  }
}
