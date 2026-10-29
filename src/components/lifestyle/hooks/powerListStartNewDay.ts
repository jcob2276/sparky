import { useHaptics } from '../../../hooks/useHaptics';
import { notify } from '../../../lib/notify';
import { resolveDailyWinTodoIds } from '../../../lib/todo/dailyWinTodoLink';
import { deleteDailyWinTasks, insertDailyWinTasks } from '../../../lib/morningPlanApi';
import { upsertDailyReconciliationScore } from '../../../lib/shutdownApi';
import { insertDailyWin, updateDailyWin } from '../../../lib/goal/goalSpine';
import { powerListDraftKey } from '../usePowerListTypes';
import { buildMorningReflectionRecord } from '../powerList/morningReflectionModel';
import type { UsePowerListActionsArgs } from './usePowerListActionsTypes';

export async function startNewDayHelper(args: UsePowerListActionsArgs, haptics: ReturnType<typeof useHaptics>) {
  if (args.submitting) return;
  if (args.yesterdayNoteRequired && !args.yesterdayNote.trim()) {
    notify('Najpierw odpowiedz, dlaczego zrealizowałeś / nie zrealizowałeś zadania z wczoraj.', 'error');
    return;
  }
  if (!args.newTaskForm.every((t) => t.task.trim())) {
    notify('Wypełnij wszystkie 5 zadań, żeby zacząć dzień.', 'error');
    return;
  }

  args.setSubmitting(true);
  try {
    if (args.yesterdayWin?.id && args.yesterdayWin.date) {
      const reflection = buildMorningReflectionRecord({
        date: args.yesterdayWin.date,
        note: args.yesterdayNote,
        dayScore: args.yesterdayDayScore,
        moodScore: args.yesterdayMoodScore,
      });
      await updateDailyWin(args.userId, args.yesterdayWin.id, reflection.dailyWinPatch);
      await upsertDailyReconciliationScore(args.userId, reflection.date, reflection.dayScore);
    }

    const todoIds = resolveDailyWinTodoIds(args.newTaskForm);

    const parentWin = await insertDailyWin(args.userId, {
      user_id: args.userId,
      date: args.today,
      result: null,
    });

    // Clear stale rows from upsert trigger fan-out before inserting today's slots.
    await deleteDailyWinTasks(args.userId, parentWin.id);

    const taskEntries = args.newTaskForm.map((slot, idx) => ({
      day_win_id: parentWin.id,
      slot: idx + 1,
      user_id: args.userId,
      title: slot.task,
      category: idx === 0 ? 'cialo' : idx === 1 ? 'duch' : idx === 2 ? 'konto' : 'general',
      todo_id: todoIds[idx],
      checkpoint_id: slot.checkpointId,
      project_id: slot.projectId,
      pin_id: slot.pinId,
      target_value: slot.targetValue?.trim() || null,
      kpi_id: slot.kpiId ?? null,
      time_slot: slot.timeSlot ?? null,
      done: false,
    }));

    const insertedTasks = await insertDailyWinTasks(args.userId, taskEntries);

    const data = {
      ...parentWin,
      daily_win_tasks: insertedTasks.length > 0 ? insertedTasks : taskEntries.map((t, i) => ({
        ...t,
        id: `local-${i}`,
        completed_at: null,
        created_at: null,
      })),
    };

    try {
      localStorage.removeItem(powerListDraftKey(args.userId, args.today));
    } catch {
      /* ignore */
    }
    haptics.success();
    if (args.onUpdate) args.onUpdate(data);
  } catch (err: unknown) {
    console.error('[startNewDay]', err);
    haptics.error();
    notify('Błąd startu dnia: ' + (err instanceof Error ? err.message : 'nieznany błąd'), 'error');
  } finally {
    args.setSubmitting(false);
  }
}
