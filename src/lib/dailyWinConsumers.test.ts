import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDailyWin } from './shutdownApi';
import { fetchDailyWinWithTasks } from './todo/todoApi';
import { fetchMultiDomainMatrixApi } from './multiDomainMatrixApi';

const db = vi.hoisted(() => ({ missing: false }));
vi.mock('./supabase', () => ({ supabase: { from: (table: string) => {
  let single = false;
  const day = { id: 'day', date: '2026-10-28', result: null, task_1: 'stale', done_1: false,
    daily_win_tasks: [{ id: 'task', day_win_id: 'day', user_id: 'owner', slot: 1, title: 'Source task',
      done: true, category: 'konto', todo_id: 'todo', project_id: 'project', completed_at: 'now',
      checkpoint_id: null, pin_id: null, target_value: null, time_slot: 'noon', created_at: null, updated_at: null }] };
  const query = {
    select: () => query, eq: () => query, gte: () => query, order: () => query,
    maybeSingle: () => { single = true; return query; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'daily_wins'
      ? (single ? (db.missing ? null : day) : [day]) : [], error: null }).then(resolve),
  };
  return query;
} } }));
beforeEach(() => { db.missing = false; });

describe('daily win consumers', () => {
  it.each([['shutdown', fetchDailyWin], ['Power List', fetchDailyWinWithTasks]] as const)(
    '%s receives compatibility slots from task rows', async (_name, fetch) => {
      expect(await fetch('owner', '2026-10-28')).toMatchObject({ task_1: 'Source task', done_1: true,
        category_1: 'konto', task_1_todo_id: 'todo', task_1_project_id: 'project', completed_at_1: 'now' });
    },
  );
  it('matrix receives the same title and completion state', async () => {
    const result = await fetchMultiDomainMatrixApi('owner', '2026-10-01');
    expect(result.wins[0]).toMatchObject({ task_1: 'Source task', done_1: true });
  });
  it('keeps an absent plan absent for shutdown and Power List', async () => {
    db.missing = true;
    expect(await fetchDailyWin('owner', '2026-10-28')).toBeNull();
    expect(await fetchDailyWinWithTasks('owner', '2026-10-28')).toBeNull();
  });
});
