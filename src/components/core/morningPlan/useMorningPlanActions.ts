import { useMemo, useState } from 'react';
import {
  updateTodoDueDate,
  submitMorningPlanRpc,
} from '../../../lib/morningPlanApi';
import { useCalendarWrite } from '../../calendar/hooks/useCalendarWrite';
import { combineDateTimeWarsawISO } from '../../../lib/date';
import { notify } from '../../../lib/notify';
import { addMinutes, isoDateStr, isoDurationMin, isoMinutesOfDay } from './morningPlanHelpers';
import { TodoSlot, CalEvent } from './types';
import { CAPACITY_HOURS } from './useMorningPlanData';
import { TimelineBlock } from '../../shared/DayTimeline';
import { buildMorningPlanSlots, createCustomPlanSlot } from './morningPlanModel';

interface UseMorningPlanActionsArgs {
  userId: string | undefined;
  planningDate: string;
  onClose: () => void;
  yesterdayTasks: TodoSlot[];
  setYesterdayTasks: React.Dispatch<React.SetStateAction<TodoSlot[]>>;
  setTodayTasks: React.Dispatch<React.SetStateAction<TodoSlot[]>>;
  setInboxTasks: React.Dispatch<React.SetStateAction<TodoSlot[]>>;
  powerList: (TodoSlot | null)[];
  setPowerList: React.Dispatch<React.SetStateAction<(TodoSlot | null)[]>>;
  todayWinId: string | null;
  times: Record<string, string>;
  durations: Record<string, number>;
  weekCalendarEvents: CalEvent[];
}

export function useMorningPlanActions({
  userId,
  planningDate,
  onClose,
  yesterdayTasks,
  setYesterdayTasks,
  setTodayTasks,
  setInboxTasks,
  powerList,
  setPowerList,
  todayWinId: _todayWinId,
  times,
  durations,
  weekCalendarEvents,
}: UseMorningPlanActionsArgs) {
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const { createEvent } = useCalendarWrite({ userId });

  const handleYesterdayAction = async (taskId: string, action: 'today' | 'later' | 'backlog' | 'drop' | 'done') => {
    const target = yesterdayTasks.find((t) => t.id === taskId);
    if (!target) return;

    // Optimistic update
    setYesterdayTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (action === 'today') setTodayTasks((prev) => [...prev, { ...target, due_date: planningDate }]);
    if (action === 'backlog') setInboxTasks((prev) => [...prev, { ...target, due_date: null }]);

    const revert = () => {
      setYesterdayTasks((prev) => [...prev, target]);
      if (action === 'today') setTodayTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (action === 'backlog') setInboxTasks((prev) => prev.filter((t) => t.id !== taskId));
    };

    try {
      await updateTodoDueDate(taskId, action, planningDate);
    } catch (e: unknown) {
      console.error('Error handling yesterday task action:', e);
      notify('Nie udało się zaktualizować zadania', 'error');
      revert();
    }
  };

  const handleAssignToSlot = (slotIndex: number, task: TodoSlot) => {
    setPowerList((prev) => {
      const next = prev.map((s, idx) => {
        if (idx === slotIndex) return { ...task, todoId: task.todoId ?? task.id };
        if (s?.id === task.id) return null;
        return s;
      });
      return next;
    });
    setActiveSlotIdx(null);
  };

  const handleEditSlot = (slotIndex: number, title: string) => {
    setPowerList((previous) => {
      const next = [...previous];
      next[slotIndex] = title.trim() ? createCustomPlanSlot(title, slotIndex) : null;
      return next;
    });
  };

  const handleClearSlot = (idx: number) => {
    setPowerList((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const dayCalendarEvents = useMemo(
    () => weekCalendarEvents.filter((e) => e.start_time && isoDateStr(e.start_time) === planningDate),
    [weekCalendarEvents, planningDate],
  );

  const calendarMeetingMinutes = useMemo(
    () => dayCalendarEvents.reduce((sum, e) => sum + (e.end_time ? isoDurationMin(e.start_time, e.end_time) : 0), 0),
    [dayCalendarEvents],
  );

  const totalMinutesPlanned = useMemo(() => {
    let sum = calendarMeetingMinutes;
    const powerListTaskIds = new Set(powerList.filter(Boolean).map((t) => t!.id));

    Object.keys(times).forEach((taskId) => {
      if (times[taskId] && powerListTaskIds.has(taskId)) {
        sum += durations[taskId] || 30;
      }
    });
    return sum;
  }, [powerList, times, durations, calendarMeetingMinutes]);

  const capacityPct = Math.min(100, Math.round((totalMinutesPlanned / (CAPACITY_HOURS * 60)) * 100));
  const capacityHoursPlanned = Math.round((totalMinutesPlanned / 60) * 10) / 10;
  const isOverloaded = capacityHoursPlanned > CAPACITY_HOURS;

  const timelineBlocks: TimelineBlock[] = useMemo(() => {
    const existing: TimelineBlock[] = dayCalendarEvents.map((e, i) => ({
      id: `existing-${i}`,
      startMin: isoMinutesOfDay(e.start_time),
      durationMin: e.end_time ? isoDurationMin(e.start_time, e.end_time) : 30,
      label: e.summary || 'Wydarzenie',
      variant: 'existing',
    }));
    const uniqueTasks = powerList.filter(Boolean).filter(
      (t, idx, self): t is TodoSlot => !!t && self.findIndex((x) => x?.id === t?.id) === idx,
    );
    const planned: TimelineBlock[] = uniqueTasks
      .filter((t) => times[t.id])
      .map((t) => {
        const [h, m] = times[t.id].split(':').map(Number);
        return {
          id: t.id,
          startMin: (h || 0) * 60 + (m || 0),
          durationMin: durations[t.id] || 30,
          label: t.title,
          variant: 'planned' as const,
        };
      });
    return [...existing, ...planned];
  }, [dayCalendarEvents, powerList, times, durations]);

  const handleSubmitPlan = async () => {
    if (!userId) return;
    setSending(true);
    try {
      const slots = buildMorningPlanSlots(powerList);

      const allSchedulable = powerList.filter(Boolean) as TodoSlot[];
      const uniqueTasksMap = new Map<string, TodoSlot>();
      allSchedulable.forEach((t) => uniqueTasksMap.set(t.id, t));

      const schedules = [...uniqueTasksMap.values()]
        .filter((task) => Boolean(task.todoId && times[task.id]))
        .map((task) => ({
          todo_id: task.todoId!,
          scheduled_time: combineDateTimeWarsawISO(planningDate, times[task.id]),
          duration_minutes: durations[task.id] || 30,
        }));

      // Atomic: wins + slots + todo schedules (todayWinId unused — RPC upserts by date)
      await submitMorningPlanRpc(userId, planningDate, slots, schedules);

      // Best-effort calendar sync (external I/O — not in DB transaction)
      let calendarErrors = 0;
      for (const [taskId, task] of uniqueTasksMap.entries()) {
        const startTime = times[taskId];
        if (!startTime) continue;
        const dur = durations[taskId] || 30;
        const endTime = addMinutes(startTime, dur);
        try {
          await createEvent({
            summary: task.title,
            start: combineDateTimeWarsawISO(planningDate, startTime),
            end: combineDateTimeWarsawISO(planningDate, endTime),
            category: 'praca',
          });
        } catch (calErr: unknown) {
          calendarErrors++;
          console.warn('[morningPlan] calendar sync failed:', calErr);
        }
      }

      if (calendarErrors > 0) {
        notify(
          `Plan zapisany. Kalendarz: ${calendarErrors} wydarzeń nie zsynchronizowano — spróbuj ponownie później.`,
          'error',
        );
      }
      onClose();
    } catch (err: unknown) {
      console.error('[Action Error]', err);
      notify(err instanceof Error ? err.message : 'Wystąpił błąd', 'error');
    } finally {
      setSending(false);
    }
  };

  return {
    sending,
    activeSlotIdx,
    setActiveSlotIdx,
    handleYesterdayAction,
    handleAssignToSlot,
    handleEditSlot,
    handleClearSlot,
    dayCalendarEvents,
    calendarMeetingMinutes,
    totalMinutesPlanned,
    capacityPct,
    capacityHoursPlanned,
    isOverloaded,
    timelineBlocks,
    handleSubmitPlan,
  };
}
