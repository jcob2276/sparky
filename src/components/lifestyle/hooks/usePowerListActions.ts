import { getWarsawHour } from '../../../lib/date';
import { useHaptics } from '../../../hooks/useHaptics';
import { notify } from '../../../lib/notify';
import { markCheckpointDone } from '../../../lib/checkpoints';
import { resolveDailyWinTodoIds } from '../../../lib/todo/dailyWinTodoLink';
import type { TablesUpdate } from '../../../lib/database.types';
import { appendStreamEntry } from '../../../lib/streamApi';
import { deleteDailyWinTasks, insertDailyWinTasks } from '../../../lib/morningPlanApi';
import { upsertDailyReconciliationScore } from '../../../lib/shutdownApi';
import {
  applyKpiRollup,
  currentWeekStart,
  fetchKpisForProject,
  insertDailyWin,
  rollupTaskCompletion,
  updateDailyWin,
  updateDailyWinTaskDone,
} from '../../../lib/goal/goalSpine';
import {
  type TaskSlot,
  type DailyWinWithTasks,
  type DailyWinRecord,
  type ProjectOption,
  powerListDraftKey,
} from '../usePowerListTypes';
import { buildMorningReflectionRecord } from '../powerList/morningReflectionModel';
import type { useDirectionContext } from '../direction/hooks/useDirectionContext';
import {
  suggestDailyKpiTarget,
  kpiSlotHint,
  defaultPillarProject,
  pickRollupKpi,
  type PillarProjectBinding,
  type KpiHint,
} from '../../../lib/dailyPlanProposal';

type DirectionContextValue = ReturnType<typeof useDirectionContext>;

interface UsePowerListActionsArgs {
  userId: string;
  today: string;
  direction: DirectionContextValue;
  pillarProjects: PillarProjectBinding[];
  newTaskForm: TaskSlot[];
  setNewTaskForm: React.Dispatch<React.SetStateAction<TaskSlot[]>>;
  checkpointPrompt: { index: number; checkpointId: string; title: string } | null;
  setCheckpointPrompt: React.Dispatch<React.SetStateAction<{ index: number; checkpointId: string; title: string } | null>>;
  setMarkingCheckpoint: React.Dispatch<React.SetStateAction<boolean>>;
  yesterdayWin: DailyWinWithTasks | null;
  yesterdayNote: string;
  yesterdayDayScore: number;
  yesterdayMoodScore: number;
  yesterdayNoteRequired: boolean;
  submitting: boolean;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  eveningNote: string;
  savingEvening: boolean;
  setSavingEvening: React.Dispatch<React.SetStateAction<boolean>>;
  todaySlotKpis: Record<number, string>;
  onUpdate?: (data: Record<string, unknown>) => void;
  setTodaySlotKpis: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  allProjectOptions: ProjectOption[];
}

export function usePowerListActions(args: UsePowerListActionsArgs) {
  const haptics = useHaptics();

  return {
    fillSlotFromCheckpoint: (payload: { title: string; checkpointId: string; projectId: string }, slotIndex?: number) =>
      fillSlotFromCheckpointHelper(payload, slotIndex, args.newTaskForm, args.setNewTaskForm, haptics),
    confirmCheckpointDone: () => confirmCheckpointDoneHelper(args),
    saveEveningClose: (win: DailyWinWithTasks | null) => saveEveningCloseHelper(args, win, haptics),
    toggleTask: (idx: number, win: DailyWinWithTasks | null) => toggleTaskHelper(args, idx, win, haptics),
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
    const data = await updateDailyWin(args.userId, todayWin.id, { day_note: note });
    void appendStreamEntry({
      userId: args.userId,
      source: 'powerlist',
      content: `Domknięcie dnia: ${note}`,
      metadata: { kind: 'day_close', date: args.today },
    });
    haptics.light();
    if (args.onUpdate) args.onUpdate(data);
  } catch (err: unknown) {
    console.error('[saveEveningClose]', err);
    notify('Nie udało się zapisać domknięcia dnia.', 'error');
  } finally {
    args.setSavingEvening(false);
  }
}

async function toggleTaskHelper(args: UsePowerListActionsArgs, index: number, todayWinInput: DailyWinWithTasks | null, haptics: ReturnType<typeof useHaptics>) {
  if (!todayWinInput) return;
  const todayWin = todayWinInput as DailyWinRecord;
  const slot = index + 1;
  const field = `done_${slot}`;
  const timeField = `completed_at_${slot}`;
  const todoIdField = `task_${slot}_todo_id`;
  const checkpointIdField = `task_${slot}_checkpoint_id`;
  const taskRow = (todayWin.daily_win_tasks ?? []).find((t) => t.slot === slot);
  const newValue = taskRow ? !taskRow.done : !todayWin[field];
  const timestamp = newValue ? new Date().toISOString() : null;

  const allDone = [1, 2, 3, 4, 5].every((i) => {
    if (!todayWin[`task_${i}`]) return true;
    if (i === slot) return newValue;
    return todayWin[`done_${i}`];
  });

  const resultPatch: TablesUpdate<'daily_wins'> = {};
  if (allDone) resultPatch.result = 'Z';
  else {
    if (todayWin.result === 'Z') resultPatch.result = null;
    const warsawHour = getWarsawHour();
    if (warsawHour >= 23 && !allDone) resultPatch.result = 'P';
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

    if (newValue) haptics.success(); else haptics.light();
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
  } catch (err: unknown) {
    console.error('[PowerList] toggleTask failed', err);
    notify('Nie udało się zapisać zadania.', 'error');
  }
}

async function startNewDayHelper(args: UsePowerListActionsArgs, haptics: ReturnType<typeof useHaptics>) {
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

function updateSlotHelper(args: UsePowerListActionsArgs, i: number, patch: Partial<TaskSlot>) {
  args.setNewTaskForm((prev) => {
    const n = [...prev];
    n[i] = { ...n[i], ...patch };
    if (patch.task !== undefined && !patch.task.trim()) {
      n[i].checkpointId = null;
      n[i].projectId = null;
      n[i].pinId = null;
      n[i].targetValue = '';
      n[i].kpiId = null;
    }
    const taskText = patch.task !== undefined ? patch.task : n[i].task;
    const SPHERE_SLOTS = [
      { category: 'cialo', label: 'Ciało' },
      { category: 'duch',  label: 'Duch' },
      { category: 'konto', label: 'Konto' },
    ];
    if (taskText.trim() && i < 3 && !n[i].projectId && !patch.projectId) {
      const pillar = SPHERE_SLOTS[i].category as 'cialo' | 'duch' | 'konto';
      const binding = defaultPillarProject(pillar, args.pillarProjects, args.direction.sprintFocusProjectIds ?? []);
      if (binding) {
        n[i].projectId = binding.projectId;
        const picked = pickRollupKpi(binding.kpis);
        n[i].kpiId = picked?.id ?? null;
        const hint = kpiSlotHint(binding.kpis, n[i].kpiId);
        if (hint.autoTarget && !n[i].targetValue?.trim()) n[i].targetValue = hint.autoTarget;
      }
    }
    if (patch.kpiId !== undefined) {
      n[i].kpiId = patch.kpiId;
      args.setTodaySlotKpis((prev) => {
        const next = { ...prev };
        if (patch.kpiId) next[i] = patch.kpiId;
        else delete next[i];
        return next;
      });
    }
    if (patch.projectId !== undefined) {
      const proj =
        args.allProjectOptions.find((p) => p.id === patch.projectId) ??
        args.pillarProjects.find((p) => p.projectId === patch.projectId);
      const kpis: KpiHint[] = proj?.kpis ?? [];
      const picked = pickRollupKpi(kpis, n[i].kpiId);
      n[i].kpiId = picked?.id ?? null;
      const kpiRow = kpis.find((k) => k.id === n[i].kpiId);
      const suggested = suggestDailyKpiTarget(kpiRow ? [kpiRow] : kpis);
      if (suggested && !n[i].targetValue?.trim()) n[i].targetValue = suggested;
      if (!patch.projectId) n[i].kpiId = null;
    }
    return n;
  });
}

function projectOptionsForSlotHelper(slotIndex: number, pillarProjects: PillarProjectBinding[], allProjectOptions: ProjectOption[]) {
  if (slotIndex < 3) {
    const SPHERE_SLOTS = [
      { category: 'cialo', label: 'Ciało' },
      { category: 'duch',  label: 'Duch' },
      { category: 'konto', label: 'Konto' },
    ];
    const pillar = SPHERE_SLOTS[slotIndex].category as 'cialo' | 'duch' | 'konto';
    const pillarOpts = pillarProjects.filter((p) => p.pillar === pillar);
    if (pillarOpts.length > 0) {
      return pillarOpts.map((p) => ({
        id: p.projectId,
        name: p.name ?? 'Projekt',
        kpis: p.kpis,
      }));
    }
  }
  return allProjectOptions;
}

function kpiHintForSlotHelper(
  slotIndex: number,
  projectId: string | null,
  kpiId: string | null | undefined,
  pillarProjects: PillarProjectBinding[],
  allProjectOptions: ProjectOption[]
) {
  if (!projectId) return null;
  const proj =
    allProjectOptions.find((p) => p.id === projectId) ??
    pillarProjects.find((p) => p.projectId === projectId);
  return kpiSlotHint(proj?.kpis ?? [], kpiId);
}

function kpisForProjectHelper(projectId: string | null, pillarProjects: PillarProjectBinding[], allProjectOptions: ProjectOption[]) {
  if (!projectId) return [];
  const proj =
    allProjectOptions.find((p) => p.id === projectId) ??
    pillarProjects.find((p) => p.projectId === projectId);
  return proj?.kpis ?? [];
}
