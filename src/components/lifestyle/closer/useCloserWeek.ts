import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCloserWeekLogs, upsertCloserDailyLog } from '../../../lib/closer/closerApi';
import { fetchCloserCalls } from '../../../lib/closer/closerCallsApi';
import { recordedDayTotals } from '../../../lib/closer/closerLibrary';
import { saveCloserWorkContext } from '../../../lib/closer/closerDayApi';
import type { WorkContext } from '../../../lib/closer/closerWorkContext';
import { closerKeys, goalSpineKeys } from '../../../lib/queryKeys';
import { getTodayWarsaw, getWeekStartWarsaw } from '../../../lib/date';
export function useCloserWeek(userId: string, weekStart: string) {
  const client = useQueryClient();
  const [selection, setSelection] = useState({ weekStart, date: getWeekStartWarsaw(getTodayWarsaw()) === weekStart ? getTodayWarsaw() : weekStart });
  const selectedDate = selection.weekStart === weekStart ? selection.date : (getWeekStartWarsaw(getTodayWarsaw()) === weekStart ? getTodayWarsaw() : weekStart);
  const logs = useQuery({ queryKey: closerKeys.week(userId, weekStart), queryFn: () => fetchCloserWeekLogs(userId, weekStart), enabled: !!userId && !!weekStart });
  const library = useQuery({ queryKey: closerKeys.library(userId), queryFn: () => fetchCloserCalls(userId), enabled: !!userId });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: closerKeys.all });
    void client.invalidateQueries({ queryKey: goalSpineKeys.all });
  };
  const numbers = useMutation({
    mutationFn: ({ date, patch }: { date: string; patch: Parameters<typeof upsertCloserDailyLog>[2] }) => upsertCloserDailyLog(userId, weekStart, { ...patch, date }),
    onSuccess: refresh,
  });
  const context = useMutation({
    mutationFn: ({ date, value }: { date: string; value: WorkContext }) => saveCloserWorkContext(userId, date, value),
    onSuccess: saved => { client.setQueryData(closerKeys.day(userId, saved.date), saved); refresh(); },
  });
  const selectDate = (date: string) => { if (!numbers.isPending) numbers.reset(); if (!context.isPending) context.reset(); setSelection({ weekStart, date }); };
  return { recorded: recordedDayTotals(library.data ?? [], selectedDate), libraryReady: library.isSuccess, logs, selectedDate, selectDate, numbers, context };
}
