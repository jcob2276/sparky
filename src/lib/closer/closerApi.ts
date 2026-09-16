import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { addDays, format } from 'date-fns';

export type CloserDailyLogRow = Database['public']['Tables']['closer_daily_logs']['Row'];

export async function fetchCloserWeekLogs(
  userId: string,
  weekStart: string,
): Promise<CloserDailyLogRow[]> {
  const startDate = new Date(weekStart + 'T12:00:00');
  const endDate = addDays(startDate, 6);
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('closer_daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', endStr)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CloserDailyLogRow[];
}

export async function upsertCloserDailyLog(
  userId: string,
  weekStart: string,
  entry: {
    date: string;
    dials?: number;
    work_hours?: number;
    appointments?: number;
    sales_calls?: number;
    notes?: string | null;
  },
): Promise<CloserDailyLogRow> {
  const { data, error } = await supabase
    .from('closer_daily_logs')
    .upsert(
      {
        user_id: userId,
        date: entry.date,
        dials: entry.dials ?? 0,
        work_hours: entry.work_hours ?? 0,
        appointments: entry.appointments ?? 0,
        sales_calls: entry.sales_calls ?? 0,
        notes: entry.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single();

  if (error) throw error;

  // Sync with goal_kpis & kpi_entries so all week summaries match
  await syncCloserWeeklyRollups(userId, weekStart);

  return data as CloserDailyLogRow;
}

async function syncCloserWeeklyRollups(userId: string, weekStart: string): Promise<void> {
  const logs = await fetchCloserWeekLogs(userId, weekStart);

  const sumAppointments = logs.reduce((acc, l) => acc + (l.appointments || 0), 0);
  const sumSalesCalls = logs.reduce((acc, l) => acc + (l.sales_calls || 0), 0);
  const sumDials = logs.reduce((acc, l) => acc + (l.dials || 0), 0);
  const sumWorkHours = logs.reduce((acc, l) => acc + (Number(l.work_hours) || 0), 0);

  const { data: proj } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', '%closer%')
    .eq('status', 'active')
    .maybeSingle();

  if (!proj) return;

  const { data: kpis } = await supabase
    .from('goal_kpis')
    .select('id, name')
    .eq('user_id', userId)
    .eq('project_id', proj.id);

  if (!kpis) return;

  for (const k of kpis) {
    let val = 0;
    const nameLow = k.name.toLowerCase();
    if (nameLow.includes('umówie')) val = sumAppointments;
    else if (nameLow.includes('call')) val = sumSalesCalls;
    else if (nameLow.includes('dial')) val = sumDials;
    else if (nameLow.includes('godzin')) val = Math.round(sumWorkHours * 10) / 10;

    await supabase
      .from('kpi_entries')
      .upsert(
        {
          user_id: userId,
          kpi_id: k.id,
          week_start: weekStart,
          value: val,
        },
        { onConflict: 'kpi_id,week_start' },
      );
  }
}
