import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../lib/date';
import { notify } from '../../../lib/notify';
import { updateDailyWin } from '../../../lib/goal/goalSpine.mutations';
import { useUserId } from '../../../store/useStore';
import type { Tables } from '../../../lib/database.types';
import { shutdownKeys } from '../../../lib/queryKeys';
import {
  fetchDailyWin,
  fetchDailyReconciliationScore,
  upsertDailyReconciliationScore,
  insertVanguardStream,
} from '../../../lib/shutdownApi';
import { buildShutdownRecord } from './shutdownModel';

function taskField(win: Tables<'daily_wins'>, key: string): string | null {
  return (win as unknown as Record<string, string | null>)[key] ?? null;
}

interface ShutdownTask {
  title: string | null;
  todoId: string | null;
  done: boolean;
  idx: number;
}

interface ShutdownFetchedData {
  todayWin: Tables<'daily_wins'> | null;
  dayScore: number;
}

function computeInitialFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  today: string,
) {
  const cached = queryClient.getQueryData<ShutdownFetchedData>(
    shutdownKeys.data(userId, today),
  );
  if (!cached) return null;
  const win = cached.todayWin;
  return {
    winId: win?.id ?? null,
    completedTasks: win
      ? [!!win.done_1, !!win.done_2, !!win.done_3, !!win.done_4, !!win.done_5]
      : [false, false, false, false, false],
    reflectionText: win?.day_note || '',
    moodScore: win?.mood_score || 3,
    dayScore: cached.dayScore,
  };
}

export function useShutdownData() {
  const userId = useUserId();
  const today = getTodayWarsaw();
  const queryClient = useQueryClient();
  const initial = userId ? computeInitialFromCache(queryClient, userId, today) : null;

  const { data: fetched, isLoading: loading } = useQuery({
    queryKey: shutdownKeys.data(userId ?? '', today),
    queryFn: async (): Promise<ShutdownFetchedData> => {
      const [todayWin, dayScoreValue] = await Promise.all([
        fetchDailyWin(userId!, today),
        fetchDailyReconciliationScore(userId!, today),
      ]);
      return { todayWin, dayScore: dayScoreValue ?? 7 };
    },
    enabled: !!userId,
  });

  const todayWin = fetched?.todayWin ?? null;
  const [completedTasks, setCompletedTasks] = useState<boolean[]>(
    initial?.completedTasks ?? [false, false, false, false, false],
  );
  const [reflectionText, setReflectionText] = useState(initial?.reflectionText ?? '');
  const [moodScore, setMoodScore] = useState(initial?.moodScore ?? 3);
  const [dayScore, setDayScore] = useState(initial?.dayScore ?? 7);
  const [saving, setSaving] = useState(false);
  const [syncedWinId, setSyncedWinId] = useState<string | null>(initial?.winId ?? null);

  if (todayWin && syncedWinId !== todayWin.id) {
    setSyncedWinId(todayWin.id);
    setCompletedTasks([
      !!todayWin.done_1,
      !!todayWin.done_2,
      !!todayWin.done_3,
      !!todayWin.done_4,
      !!todayWin.done_5,
    ]);
    setReflectionText(todayWin.day_note || '');
    setMoodScore(todayWin.mood_score || 3);
    setDayScore(fetched?.dayScore ?? 7);
  }

  const tasksList: ShutdownTask[] = todayWin
    ? [1, 2, 3, 4, 5]
        .map((slot, idx) => ({
          title: taskField(todayWin, `task_${slot}`),
          todoId: taskField(todayWin, `task_${slot}_todo_id`),
          done: completedTasks[idx],
          idx,
        }))
        .filter((task) => task.title?.trim())
    : [];

  const handleSaveShutdown = async (): Promise<boolean> => {
    if (!userId || !todayWin) return false;
    setSaving(true);
    try {
      const record = buildShutdownRecord({
        date: today,
        dayScore,
        moodScore,
        reflectionText,
        completedTasks,
        activeTaskIndexes: tasksList.map((task) => task.idx),
      });

      await updateDailyWin(userId, todayWin.id, record.dailyWinPatch);
      await upsertDailyReconciliationScore(userId, today, dayScore);
      await insertVanguardStream({
        user_id: userId,
        source: 'daily_shutdown',
        content: record.streamContent,
        classification: 'reflection:evening',
        metadata: record.streamMetadata,
      });
      await queryClient.invalidateQueries({ queryKey: shutdownKeys.data(userId, today) });
      return true;
    } catch (err: unknown) {
      console.error('Error saving daily shutdown:', err);
      notify('Nie udało się zamknąć dnia', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    userId,
    today,
    loading,
    saving,
    todayWin,
    completedTasks,
    setCompletedTasks,
    reflectionText,
    setReflectionText,
    moodScore,
    setMoodScore,
    dayScore,
    setDayScore,
    tasksList,
    handleSaveShutdown,
  };
}
