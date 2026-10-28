import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adaptDailyWinTasks, fetchDailyWinTasks, fetchDailyWinTasksForDay } from './dailyWinTasksApi';
import type { Tables } from './database.types';

const db = vi.hoisted(() => ({ data: null as unknown, error: null as unknown, calls: [] as unknown[][] }));
vi.mock('./supabase', () => ({ supabase: { from: (table: string) => {
  db.calls.push(['from', table]);
  const query = {
    select: (columns: string) => { db.calls.push(['select', columns]); return query; },
    eq: (key: string, value: string) => { db.calls.push(['eq', key, value]); return query; },
    gte: (key: string, value: string) => { db.calls.push(['gte', key, value]); return query; },
    lte: (key: string, value: string) => { db.calls.push(['lte', key, value]); return query; },
    lt: (key: string, value: string) => { db.calls.push(['lt', key, value]); return query; },
    order: (key: string, options: unknown) => { db.calls.push(['order', key, options]); return query; },
    limit: (n: number) => { db.calls.push(['limit', n]); return query; },
    maybeSingle: () => query,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: db.data, error: db.error }).then(resolve),
  };
  return query;
} } }));

function task(slot: number, extra: Partial<Tables<'daily_win_tasks'>> = {}): Tables<'daily_win_tasks'> {
  return { id: `task-${slot}`, day_win_id: 'day', user_id: 'owner', slot, title: `Task ${slot}`,
    done: false, category: null, completed_at: null, todo_id: null, checkpoint_id: null,
    pin_id: null, project_id: null, target_value: null, time_slot: null, created_at: null, updated_at: null, ...extra };
}

beforeEach(() => { db.data = null; db.error = null; db.calls = []; });

describe('daily_win_tasks read adapter', () => {
  it('maps all ten fields by slot, preserves metadata and orders task rows without mutating them', () => {
    const rows = [task(5), task(2, { title: 'Call', done: true, category: 'konto', completed_at: 'now',
      todo_id: 'todo', checkpoint_id: 'checkpoint', pin_id: 'pin', project_id: 'project', target_value: '3', time_slot: 'noon' })];
    const result = adaptDailyWinTasks({ id: 'day', day_note: 'My note', task_2: 'stale', done_2: false, daily_win_tasks: rows });
    expect(result).toMatchObject({ id: 'day', day_note: 'My note', task_1: null, done_1: false,
      task_2: 'Call', done_2: true, category_2: 'konto', completed_at_2: 'now', task_2_todo_id: 'todo',
      task_2_checkpoint_id: 'checkpoint', task_2_pin_id: 'pin', task_2_project_id: 'project',
      task_2_target_value: '3', task_2_time_slot: 'noon', task_5: 'Task 5' });
    expect(result.daily_win_tasks.map(t => t.slot)).toEqual([2, 5]);
    expect(rows.map(t => t.slot)).toEqual([5, 2]);
  });

  it('clears every compatibility slot when the relation is empty instead of reviving wide columns', () => {
    const result = adaptDailyWinTasks({ task_1: 'stale', done_1: true, task_5_todo_id: 'stale', daily_win_tasks: [] });
    expect(result).toMatchObject({ task_1: null, done_1: false, task_5: null, done_5: false, task_5_todo_id: null });
    expect(Object.keys(result).filter(key => key !== 'daily_win_tasks')).toHaveLength(50);
  });

  it('fetches a scoped inclusive date range and never requests mirrored slot columns', async () => {
    db.data = [{ id: 'day', date: '2026-10-28', daily_win_tasks: [task(3)] }];
    const result = await fetchDailyWinTasks('owner', { from: '2026-10-01', to: '2026-10-28', ascending: true, limit: 60 });
    expect(result.data?.[0]).toMatchObject({ id: 'day', task_3: 'Task 3', task_1: null });
    expect(db.calls).toEqual(expect.arrayContaining([['eq', 'user_id', 'owner'], ['gte', 'date', '2026-10-01'],
      ['lte', 'date', '2026-10-28'], ['order', 'date', { ascending: true }], ['limit', 60]]));
    const select = db.calls.find(call => call[0] === 'select')?.[1] as string;
    expect(select).toContain('daily_win_tasks(*)');
    expect(select.replace('daily_win_tasks(*)', '')).not.toMatch(/\*|(?:task|done|category|completed_at)_[1-5]/);
  });

  it('supports an exclusive end for week boundaries', async () => {
    db.data = [];
    await fetchDailyWinTasks('owner', { from: '2026-10-26', before: '2026-11-02' });
    expect(db.calls).toContainEqual(['lt', 'date', '2026-11-02']);
  });

  it('distinguishes a missing day from an existing day with no slots', async () => {
    expect((await fetchDailyWinTasksForDay('owner', '2026-10-28')).data).toBeNull();
    db.data = { id: 'day', daily_win_tasks: [] };
    expect((await fetchDailyWinTasksForDay('owner', '2026-10-28')).data).toMatchObject({ id: 'day', task_1: null, done_1: false });
    expect(db.calls).toContainEqual(['eq', 'date', '2026-10-28']);
  });

  it('preserves database errors without manufacturing empty success data', async () => {
    db.error = { message: 'RLS denied' };
    expect(await fetchDailyWinTasks('owner')).toMatchObject({ data: null, error: { message: 'RLS denied' } });
    expect(await fetchDailyWinTasksForDay('owner', '2026-10-28')).toMatchObject({ data: null, error: { message: 'RLS denied' } });
  });
});
