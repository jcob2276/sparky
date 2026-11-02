import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { DayActual } from './monthPlan';

/** Umówienia i sprzedaże z dziennika closera w zakresie dat, po dniach. */
async function fetchCloserRangeActuals(userId: string, from: string, to: string): Promise<Record<string, DayActual>> {
  const { data, error } = await supabase
    .from('closer_daily_logs')
    .select('date, appointments, sales_closed')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [
    row.date,
    { appointments: row.appointments ?? 0, salesClosed: row.sales_closed ?? 0 },
  ]));
}

export function useCloserRangeActuals(userId: string | undefined, from: string, to: string) {
  return useQuery<Record<string, DayActual>>({
    queryKey: ['closer-range-actuals', userId, from, to],
    enabled: Boolean(userId),
    queryFn: () => fetchCloserRangeActuals(userId as string, from, to),
  });
}
