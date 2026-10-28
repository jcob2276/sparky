import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Database, Tables } from './database.types';

type Slot = 1 | 2 | 3 | 4 | 5;
type SlotColumn = `task_${Slot}` | `category_${Slot}` | `done_${Slot}` | `completed_at_${Slot}`
  | `task_${Slot}_${'todo_id' | 'checkpoint_id' | 'pin_id' | 'project_id' | 'target_value' | 'time_slot'}`;
type SlotColumns = Pick<Tables<'daily_wins'>, SlotColumn>;
type DailyWinWithTasks = Tables<'daily_wins'> & { daily_win_tasks: Tables<'daily_win_tasks'>[] };
type ReadResult<T> = { data: T | null; error: PostgrestError | null };

// Explicit parent metadata: never request the fifty mirrored columns, even with select('*').
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
): Promise<ReadResult<DailyWinWithTasks[]>> {
  let query = client.from('daily_wins').select(DAY_WITH_TASKS).eq('user_id', userId);
  if (range.from) query = query.gte('date', range.from);
  if (range.to) query = query.lte('date', range.to);
  if (range.before) query = query.lt('date', range.before);
  if (range.ascending !== undefined) query = query.order('date', { ascending: range.ascending });
  if (range.limit !== undefined) query = query.limit(range.limit);
  const result = await query;
  return { ...result, data: result.data?.map(adaptDailyWinTasks) ?? null };
}

export async function fetchDailyWinTasksForDay(userId: string, date: string): Promise<ReadResult<DailyWinWithTasks>> {
  const result = await supabase.from('daily_wins').select(DAY_WITH_TASKS)
    .eq('user_id', userId).eq('date', date).maybeSingle();
  return { ...result, data: result.data ? adaptDailyWinTasks(result.data) : null };
}

export async function fetchDailyWinTasksById(userId: string, id: string): Promise<ReadResult<DailyWinWithTasks>> {
  const result = await supabase.from('daily_wins').select(DAY_WITH_TASKS)
    .eq('user_id', userId).eq('id', id).single();
  return { ...result, data: result.data ? adaptDailyWinTasks(result.data) : null };
}
