import { useEffect, useMemo, useRef, useState } from 'react';
import { useUserId } from '../../store/useStore';
import { useQueryClient } from '@tanstack/react-query';
import { getTodayWarsaw, getYesterdayWarsaw, getWarsawHour } from '../../lib/date';
import { useHaptics } from '../../hooks/useHaptics';
import { useLifeGoals } from '../projects/hooks/useLifeGoals';
import { useDirectionContext } from './direction/hooks/useDirectionContext';
import { usePowerListActions } from './hooks/usePowerListActions';
import { usePowerListEffects } from './hooks/usePowerListEffects';
import {
  type TaskSlot,
  EMPTY_SLOT,
  powerListKpiKey,
  type UsePowerListDataProps,
  type DailyWinWithTasks,
  type ProjectOption,
} from './usePowerListTypes';
import { type PillarProjectBinding, type DirectionProjectSummary } from '../../lib/dailyPlanProposal';
import { type LifeGoalDisplayRow } from '../../lib/projects/lifeGoals';
import { updateDailyWinTaskDone } from '../../lib/goal/goalSpine';
import { notify } from '../../lib/notify';
import { applyYesterdayTaskToggle, applyTodayTaskToggle } from './powerList/morningReflectionModel';
import { dashboardKeys } from '../../lib/queryKeys';

export type { TaskSlot, UsePowerListDataProps, ProjectOption, DailyWinWithTasks } from './usePowerListTypes';

const getPillarProjects = (rows: LifeGoalDisplayRow[]): PillarProjectBinding[] =>
  rows.filter((r) => r.projectId).map((r) => ({
    pillar: r.id as 'cialo' | 'duch' | 'konto',
    projectId: r.projectId!,
    name: r.subtitle || r.title,
    kpis: (r.kpis ?? []).map((k) => ({ id: k.id, name: k.name, current: k.current, target: k.target })),
  }));

const getAllProjectOptions = (active?: DirectionProjectSummary[]): ProjectOption[] =>
  active?.map((p) => ({ id: p.id, name: p.name, kpis: p.kpis ?? [] })) ?? [];

function getEveningCloseDue(todayWin: DailyWinWithTasks | null): boolean {
  if (!todayWin || todayWin.day_note?.trim() || !todayWin.task_1?.trim()) return false;
  return todayWin.result === 'Z' || todayWin.result === 'P' || getWarsawHour() >= 20;
}

const getInitialTaskForm = () => Array.from({ length: 5 }, () => ({ ...EMPTY_SLOT }));

export function usePowerListData({
  todayWin,
  onUpdate,
  planDaySignal,
}: UsePowerListDataProps) {
  const storeUserId = useUserId();
  const userId = storeUserId ?? '';
  const { displayRows: lifeGoalRows, refresh: refreshLifeGoals } = useLifeGoals(userId);
  const direction = useDirectionContext(userId);
  const today = getTodayWarsaw();
  const yesterdayStr = getYesterdayWarsaw();
  const haptics = useHaptics();
  const weekGoals = direction.weekGoals ?? null;
  const pillarProjects = useMemo(() => getPillarProjects(lifeGoalRows), [lifeGoalRows]);
  const allProjectOptions = useMemo(() => getAllProjectOptions(direction.activeProjects), [direction.activeProjects]);
  useEffect(() => {
    if (!todayWin) void refreshLifeGoals();
  }, [todayWin, refreshLifeGoals]);
  const [checkpointPrompt, setCheckpointPrompt] = useState<{ index: number; checkpointId: string; title: string } | null>(null);
  const [markingCheckpoint, setMarkingCheckpoint] = useState(false);
  const [yesterdayNote, setYesterdayNote] = useState('');
  const [yesterdayDayScore, setYesterdayDayScore] = useState(7);
  const [yesterdayMoodScore, setYesterdayMoodScore] = useState(3);
  const [newTaskForm, setNewTaskForm] = useState<TaskSlot[]>(getInitialTaskForm);
  const [pickerSlot, setPickerSlot] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [eveningNote, setEveningNote] = useState('');
  const [savingEvening, setSavingEvening] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const draftLoaded = useRef(false);
  const [todaySlotKpis, setTodaySlotKpis] = useState<Record<number, string>>(() => {
    try {
      const raw = localStorage.getItem(powerListKpiKey(userId, today));
      return raw ? (JSON.parse(raw) as Record<number, string>) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try {
      if (Object.keys(todaySlotKpis).length === 0) localStorage.removeItem(powerListKpiKey(userId, today));
      else localStorage.setItem(powerListKpiKey(userId, today), JSON.stringify(todaySlotKpis));
    } catch { /* ignore */ }
  }, [todaySlotKpis, userId, today]);
  const occupiedSlots = useMemo(() => newTaskForm.map((s) => !!s.task.trim()), [newTaskForm]);
  const queries = usePowerListEffects({
    userId,
    today,
    todayWin,
    draftLoadedRef: draftLoaded,
    newTaskForm,
    setNewTaskForm,
    yesterdayNote,
    setYesterdayNote,
    setYesterdayDayScore,
    setYesterdayMoodScore,
    planDaySignal,
    directionLoading: direction.loading,
  });

  const [correctedYesterdayWin, setCorrectedYesterdayWin] = useState<DailyWinWithTasks | null>(null);
  const [savingYesterdayTaskIds, setSavingYesterdayTaskIds] = useState<Set<string>>(() => new Set());
  const yesterdayWin = correctedYesterdayWin?.id === queries.yesterdayWin?.id
    ? correctedYesterdayWin
    : queries.yesterdayWin;

  const toggleYesterdayTask = async (taskId: string) => {
    if (!yesterdayWin || savingYesterdayTaskIds.has(taskId)) return;
    const task = yesterdayWin.daily_win_tasks?.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const done = !task.done;
    const completedAt = done ? new Date().toISOString() : null;
    const previousWin = yesterdayWin;
    setCorrectedYesterdayWin(applyYesterdayTaskToggle(previousWin, taskId, done, completedAt));
    setSavingYesterdayTaskIds((previous) => new Set(previous).add(taskId));

    try {
      await updateDailyWinTaskDone(userId, taskId, done, completedAt);
      if (done) haptics.success(); else haptics.light();
    } catch (error: unknown) {
      console.error('[PowerList] yesterday task correction failed', error);
      setCorrectedYesterdayWin((current) => applyYesterdayTaskToggle(
        current?.id === previousWin.id ? current : previousWin,
        taskId,
        task.done ?? false,
        task.completed_at,
      ));
      haptics.error();
      notify('Nie udało się zapisać zmiany zadania z wczoraj.', 'error');
    } finally {
      setSavingYesterdayTaskIds((previous) => {
        const next = new Set(previous);
        next.delete(taskId);
        return next;
      });
    }
  };

  const yesterdayNoteRequired = !!yesterdayWin && !yesterdayWin.day_note;

  const queryClient = useQueryClient();
  const [optimisticToggles, setOptimisticToggles] = useState<Record<number, { done: boolean; completedAt: string | null }>>({});

  const effectiveTodayWin = useMemo(() => {
    if (!todayWin) return null;
    let win = todayWin;
    for (const [slotStr, patch] of Object.entries(optimisticToggles)) {
      const slot = Number(slotStr);
      win = applyTodayTaskToggle(win, slot, patch.done, patch.completedAt);
    }
    return win;
  }, [todayWin, optimisticToggles]);

  const actions = usePowerListActions({
    userId,
    today,
    direction,
    pillarProjects,
    newTaskForm,
    setNewTaskForm,
    checkpointPrompt,
    setCheckpointPrompt,
    setMarkingCheckpoint,
    yesterdayWin,
    yesterdayNote,
    yesterdayDayScore,
    yesterdayMoodScore,
    yesterdayNoteRequired,
    submitting,
    setSubmitting,
    eveningNote,
    savingEvening,
    setSavingEvening,
    todaySlotKpis,
    onUpdate,
    setTodaySlotKpis,
    allProjectOptions,
  });

  const inFlightSlotsRef = useRef<Record<number, boolean>>({});
  const targetDoneRef = useRef<Record<number, boolean>>({});

  const toggleTask = async (index: number) => {
    if (!effectiveTodayWin) return;
    const slot = index + 1;
    const taskRow = (effectiveTodayWin.daily_win_tasks ?? []).find((t) => t.slot === slot);
    const field = `done_${slot}` as keyof DailyWinWithTasks;
    const currentDone = taskRow ? Boolean(taskRow.done) : Boolean(effectiveTodayWin[field]);
    const nextDone = !currentDone;
    const timestamp = nextDone ? new Date().toISOString() : null;

    targetDoneRef.current[slot] = nextDone;
    setOptimisticToggles((prev) => ({ ...prev, [slot]: { done: nextDone, completedAt: timestamp } }));
    if (nextDone) haptics.success(); else haptics.light();

    const previousWin = effectiveTodayWin;
    const optimisticWin = applyTodayTaskToggle(previousWin, slot, nextDone, timestamp);

    queryClient.setQueryData(dashboardKeys.main(userId), (old: unknown) => {
      if (!old || typeof old !== 'object') return old;
      return { ...(old as Record<string, unknown>), todayWin: optimisticWin };
    });

    if (inFlightSlotsRef.current[slot]) return;
    inFlightSlotsRef.current[slot] = true;

    try {
      while (targetDoneRef.current[slot] !== undefined) {
        const desiredDone = targetDoneRef.current[slot];
        delete targetDoneRef.current[slot];
        const desiredTimestamp = desiredDone ? new Date().toISOString() : null;

        const currentBaseWin = queryClient.getQueryData<{ todayWin?: DailyWinWithTasks }>(dashboardKeys.main(userId))?.todayWin ?? previousWin;
        const mergedWin = await actions.toggleTask(index, currentBaseWin, desiredDone, desiredTimestamp);
        if (mergedWin) {
          queryClient.setQueryData(dashboardKeys.main(userId), (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            return { ...(old as Record<string, unknown>), todayWin: mergedWin };
          });
        }
      }
    } catch (error: unknown) {
      console.error('[PowerList] toggleTask failed', error);
      queryClient.setQueryData(dashboardKeys.main(userId), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        return { ...(old as Record<string, unknown>), todayWin: previousWin };
      });
      haptics.error();
      notify('Nie udało się zapisać zadania.', 'error');
    } finally {
      delete inFlightSlotsRef.current[slot];
      delete targetDoneRef.current[slot];
      setOptimisticToggles((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };

  const eveningCloseDue = useMemo(() => getEveningCloseDue(effectiveTodayWin), [effectiveTodayWin]);
  return {
    userId,
    today,
    direction,
    haptics,
    weekGoals,
    pillarProjects,
    allProjectOptions,
    projectMap: queries.projectMap,
    checkpointPrompt,
    setCheckpointPrompt,
    markingCheckpoint,
    yesterdayWin,
    yesterdayNote,
    setYesterdayNote,
    yesterdayDayScore,
    setYesterdayDayScore,
    yesterdayMoodScore,
    setYesterdayMoodScore,
    yesterdayNoteRequired,
    toggleYesterdayTask,
    savingYesterdayTaskIds,
    newTaskForm,
    setNewTaskForm,
    todoItems: queries.todoItems,
    pickerSlot,
    setPickerSlot,
    submitting,
    eveningNote,
    setEveningNote,
    savingEvening,
    pickerRef,
    todaySlotKpis,
    occupiedSlots,
    todayWin: effectiveTodayWin,
    eveningCloseDue,
    fillSlotFromCheckpoint: actions.fillSlotFromCheckpoint,
    confirmCheckpointDone: actions.confirmCheckpointDone,
    saveEveningClose: () => actions.saveEveningClose(effectiveTodayWin),
    toggleTask,
    startNewDay: actions.startNewDay,
    updateSlot: actions.updateSlot,
    projectOptionsForSlot: actions.projectOptionsForSlot,
    kpiHintForSlot: actions.kpiHintForSlot,
    kpisForProject: actions.kpisForProject,
    todayStr: today,
    yesterdayStr,
  };
}
