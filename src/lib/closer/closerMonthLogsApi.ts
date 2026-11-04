import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getWeekStartWarsaw } from '../growth/growth';
import { upsertCloserDailyLog } from './closerApi';
import type { DayActual } from './monthPlan';

/** Liczby, czas i refleksja z dziennika closera w zakresie dat, po dniach. */
async function fetchCloserRangeActuals(userId: string, from: string, to: string): Promise<Record<string, DayActual>> {
  const { data, error } = await supabase
    .from('closer_daily_logs')
    .select('date, dials, appointments, sales_calls, sales_closed, work_hours, reflection_minutes, learning_minutes, notes')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [
    row.date,
    {
      dials: row.dials ?? 0,
      appointments: row.appointments ?? 0,
      salesCalls: row.sales_calls ?? 0,
      salesClosed: row.sales_closed ?? 0,
      workMinutes: Math.round(Number(row.work_hours ?? 0) * 60),
      reflectionMinutes: row.reflection_minutes ?? 0,
      learningMinutes: row.learning_minutes ?? 0,
      reflection: row.notes ?? '',
    },
  ]));
}

export function useCloserRangeActuals(userId: string | undefined, from: string, to: string) {
  return useQuery<Record<string, DayActual>>({
    queryKey: ['closer-range-actuals', userId, from, to],
    enabled: Boolean(userId),
    queryFn: () => fetchCloserRangeActuals(userId as string, from, to),
  });
}

/** Zapisuje cały wpis dnia; energia i presja zostają, bo upsert nie nadpisuje pominiętych kolumn. */
export function useSaveCloserDay(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, day }: { date: string; day: DayActual }) => {
      if (!userId) throw new Error('Brak zalogowanego użytkownika.');
      await upsertCloserDailyLog(userId, getWeekStartWarsaw(date), {
        date,
        numbers_entered_at: new Date().toISOString(),
        dials: day.dials,
        appointments: day.appointments,
        sales_calls: day.salesCalls,
        sales_closed: day.salesClosed,
        work_hours: Math.round((day.workMinutes / 60) * 100) / 100,
        reflection_minutes: day.reflectionMinutes,
        learning_minutes: day.learningMinutes,
        notes: day.reflection.trim() === '' ? null : day.reflection.trim(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['closer-range-actuals', userId] }),
  });
}
