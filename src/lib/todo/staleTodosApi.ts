import { supabase } from '../supabase';
import type { TodoItemRow } from './todo';

export const STALE_TODO_MIN_DAYS = 14;
const DAY_MS = 86_400_000;

export type StaleTodo = Pick<TodoItemRow, 'id' | 'title' | 'updated_at'> & { daysIdle: number };

export function daysIdleSince(updatedAt: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(updatedAt)) / DAY_MS));
}

/** Otwarte zadania bez żadnej zmiany od co najmniej `minDays` dni — najdłużej leżące pierwsze. */
export async function listStaleTodos(userId: string, limit = 5, minDays = STALE_TODO_MIN_DAYS): Promise<StaleTodo[]> {
  const now = Date.now();
  const { data, error } = await supabase
    .from('todo_items')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .neq('status', 'done')
    .is('parent_task_id', null)
    .lt('updated_at', new Date(now - minDays * DAY_MS).toISOString())
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, daysIdle: daysIdleSince(row.updated_at, now) }));
}
