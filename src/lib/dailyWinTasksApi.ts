import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Database, Tables, TablesInsert, TablesUpdate } from './database.types';

type Slot = 1 | 2 | 3 | 4 | 5;
type SlotColumn = `task_${Slot}` | `category_${Slot}` | `done_${Slot}` | `completed_at_${Slot}`
  | `task_${Slot}_${'todo_id' | 'checkpoint_id' | 'pin_id' | 'project_id' | 'target_value' | 'time_slot'}`;
/** Kolumn slotów nie ma już w daily_wins; to kształt zgodności budowany w pamięci z wierszy daily_win_tasks. */
type SlotColumns = { [K in SlotColumn]: K extends `done_${Slot}` ? boolean | null : string | null };
export type DailyWinWithTasks = Tables<'daily_wins'> & { daily_win_tasks: Tables<'daily_win_tasks'>[] };
export type DailyWinMetadataUpdate = TablesUpdate<'daily_wins'>;
export type DailyWinMetadataInsert = TablesInsert<'daily_wins'>;
type AdaptedDailyWin = DailyWinWithTasks & SlotColumns;
type ReadResult<T> = { data: T | null; error: PostgrestError | null };

// Jawna lista metadanych dnia (bez select('*')).
const DAY_WITH_TASKS = 'id,user_id,date,created_at,week_start,result,day_note,daily_rpe,embedding,gratitude_entry,importance_score,is_intervention,journal_entry,mood_score,tags,daily_win_tasks(*)' as const;
const SLOTS = [1, 2, 3, 4, 5] as const;

/** Compatibility shape for existing UI logic; every slot comes exclusively from task rows. */
export function adaptDailyWinTasks<T extends { daily_win_tasks: Tables<'daily_win_tasks'>[] | null }>(day: T): T & SlotColumns {
  const tasks = [...(day.daily_win_tasks ?? [])].sort((a, b) => a.slot - b.slot);
  const slots = Object.fromEntries(SLOTS.flatMap(slot => {
    const task = tasks.find(row => row.slot === slot);
    return [
      [`task_${slot}`, task?.title ?? null], [`done_${slot}`, task?.done ?? false],
      [`category_${slot}`, task?.category ?? null], [`completed_at_${slot}`, task?.completed_at ?? null],
      ...(['todo_id', 'checkpoint_id', 'pin_id', 'project_id', 'target_value', 'time_slot'] as const)
        .map(field => [`task_${slot}_${field}`, task?.[field] ?? null]),
    ];
  })) as SlotColumns;
  return { ...day, ...slots, daily_win_tasks: tasks };
}

interface DayRange {
  from?: string;
  to?: string;
  before?: string;
  ascending?: boolean;
  limit?: number;
}

/** Parent metadata plus normalized task rows, fetched in one PostgREST snapshot. */
export async function fetchDailyWinTasks(
  userId: string, range: DayRange = {}, client: SupabaseClient<Database> = supabase,
): Promise<ReadResult<AdaptedDailyWin[]>> {
  let query = client.from('daily_wins').select(DAY_WITH_TASKS).eq('user_id', userId);
  if (range.from) query = query.gte('date', range.from);
  if (range.to) query = query.lte('date', range.to);
  if (range.before) query = query.lt('date', range.before);
  if (range.ascending !== undefined) query = query.order('date', { ascending: range.ascending });
  if (range.limit !== undefined) query = query.limit(range.limit);
  const result = await query;
  return { ...result, data: result.data?.map(adaptDailyWinTasks) ?? null };
}

export async function fetchDailyWinTasksForDay(userId: string, date: string): Promise<ReadResult<AdaptedDailyWin>> {
  const result = await supabase.from('daily_wins').select(DAY_WITH_TASKS)
    .eq('user_id', userId).eq('date', date).maybeSingle();
  return { ...result, data: result.data ? adaptDailyWinTasks(result.data) : null };
}

export async function fetchDailyWinTasksById(userId: string, id: string): Promise<ReadResult<AdaptedDailyWin>> {
  const result = await supabase.from('daily_wins').select(DAY_WITH_TASKS)
    .eq('user_id', userId).eq('id', id).single();
  return { ...result, data: result.data ? adaptDailyWinTasks(result.data) : null };
}

/** Missing rows are errors: never fall back to a mirrored daily_wins column. */
export async function updateDailyWinTaskBySlot(
  userId: string, dayWinId: string, slot: number, done: boolean, completedAt: string | null,
): Promise<void> {
  const { data, error } = await supabase.from('daily_win_tasks')
    .update({ done, completed_at: completedAt }).eq('user_id', userId)
    .eq('day_win_id', dayWinId).eq('slot', slot).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Nie znaleziono zadania dnia.');
}

export async function persistDailyWinTaskDone(
  userId: string, taskId: string, done: boolean, completedAt: string | null,
): Promise<void> {
  const payload = { done, completed_at: completedAt };
  try {
    const { error } = await supabase.from('daily_win_tasks').update(payload)
      .eq('user_id', userId).eq('id', taskId);
    if (error) throw error;
  } catch (err: unknown) {
    const { isOfflineError, queueOfflineWrite } = await import('./offlineQueue');
    if (!isOfflineError(err)) throw err;
    await queueOfflineWrite('table:update:daily_win_tasks',
      { match: { user_id: userId, id: taskId }, payload }, 'Odznaczenie zadania dnia');
  }
}

export async function persistDailyWinMetadata(userId: string, id: string, patch: DailyWinMetadataUpdate) {
  const { data, error } = await supabase.from('daily_wins').update(patch)
    .eq('user_id', userId).eq('id', id).select(DAY_WITH_TASKS).single();
  if (error) throw error;
  return adaptDailyWinTasks(data);
}

export async function persistDailyWin(userId: string, entry: DailyWinMetadataInsert) {
  const { data, error } = await supabase.from('daily_wins')
    .upsert({ ...entry, user_id: userId }, { onConflict: 'user_id,date' }).select(DAY_WITH_TASKS).single();
  if (error) throw error;
  return adaptDailyWinTasks(data);
}

export async function persistDailyWinsPartial(userId: string, ids: string[]) {
  const { error } = await supabase.from('daily_wins').update({ result: 'P' }).eq('user_id', userId).in('id', ids);
  if (error) throw error;
}

export async function removeDailyWinTasks(userId: string, dayWinId: string) {
  const { error } = await supabase.from('daily_win_tasks').delete().eq('user_id', userId).eq('day_win_id', dayWinId);
  if (error) throw error;
}

export async function createDailyWinTasks(userId: string, entries: TablesInsert<'daily_win_tasks'>[]) {
  const { data, error } = await supabase.from('daily_win_tasks')
    .insert(entries.map(entry => ({ ...entry, user_id: userId }))).select();
  if (error) throw error;
  return data ?? [];
}

export interface TodoKpiBinding { project_id: string | null; target_value: string | null; kpi_id: string | null }

/** Projekt/KPI zadania dnia powiązanego z Todo (tylko dziś); null, gdy Todo nie jest w planie dnia. */
export async function fetchTodayTaskKpiBinding(
  userId: string, todoId: string, date: string, client: SupabaseClient<Database> = supabase,
): Promise<TodoKpiBinding | null> {
  const { data, error } = await client.from('daily_win_tasks')
    .select('project_id, target_value, kpi_id, daily_wins!inner(date, user_id)')
    .eq('todo_id', todoId).eq('user_id', userId)
    .eq('daily_wins.date', date).eq('daily_wins.user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { project_id: data.project_id, target_value: data.target_value, kpi_id: data.kpi_id } : null;
}
