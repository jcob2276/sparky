import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../lib/date';
import { notify } from '../../../lib/notify';
import { updateDailyWin } from '../../../lib/goal/goalSpine.mutations';
import { useUserId } from '../../../store/useStore';
import { type DailyWinWithTasks, updateDailyWinTaskBySlot } from '../../../lib/dailyWinTasksApi';
import { shutdownKeys, todoKeys } from '../../../lib/queryKeys';
import {
  fetchDailyWin,
  fetchDailyReconciliationScore,
  upsertDailyReconciliationScore,
  insertSparkyStream,
} from '../../../lib/shutdownApi';
import { buildShutdownRecord } from './shutdownModel';

function completionState(win: DailyWinWithTasks): boolean[] {
  return [1, 2, 3, 4, 5].map(slot => Boolean(win.daily_win_tasks.find(task => task.slot === slot)?.done));
}

interface ShutdownTask {
  title: string | null;
  todoId: string | null;
  done: boolean;
  idx: number;
}

interface ShutdownFetchedData {
  todayWin: DailyWinWithTasks | null;
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
      ? completionState(win)
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
    setCompletedTasks(completionState(todayWin));
    setReflectionText(todayWin.day_note || '');
    setMoodScore(todayWin.mood_score || 3);
    setDayScore(fetched?.dayScore ?? 7);
  }

  const tasksList: ShutdownTask[] = todayWin
    ? [...todayWin.daily_win_tasks].sort((a, b) => a.slot - b.slot)
        .map(task => ({
          title: task.title,
          todoId: task.todo_id,
          done: completedTasks[task.slot - 1],
          idx: task.slot - 1,
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

      const timestamp = new Date().toISOString();
      for (const { slot, done } of record.taskCompletions) {
        const task = todayWin.daily_win_tasks.find(row => row.slot === slot);
        if (Boolean(task?.done) === done) continue;
        await updateDailyWinTaskBySlot(userId, todayWin.id, slot, done, done ? timestamp : null);
      }
      await updateDailyWin(userId, todayWin.id, record.dailyWinPatch);
      await upsertDailyReconciliationScore(userId, today, dayScore);
      await insertSparkyStream({
        user_id: userId,
        source: 'daily_shutdown',
        content: record.streamContent,
        classification: 'reflection:evening',
        metadata: record.streamMetadata,
      });
      await queryClient.invalidateQueries({ queryKey: shutdownKeys.data(userId, today) });
      await queryClient.invalidateQueries({ queryKey: todoKeys.dailyWins(userId, today) });
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
