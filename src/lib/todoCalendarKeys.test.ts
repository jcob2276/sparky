import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { todoKeys } from './queryKeys';

const ROOT = join(__dirname, '../..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('calendar copies of todo_items', () => {
  it('live in the todo family, so a task change in Zadania refreshes the calendar as well', async () => {
    const client = new QueryClient();
    const keys: QueryKey[] = [
      todoKeys.calendarInbox('u1'),
      todoKeys.calendarScheduled('u1', '2026-10-01', '2026-11-01'),
      todoKeys.calendarScheduled('u1', '2026-11-01', '2026-12-01'),
    ];
    keys.forEach((key) => client.setQueryData(key, []));

    await client.invalidateQueries({ queryKey: todoKeys.all });

    expect(keys.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual([true, true, true]);
  });

  it('can be invalidated for one user across every date range with a single family key', async () => {
    const client = new QueryClient();
    const mine: QueryKey[] = [todoKeys.calendarInbox('u1'), todoKeys.calendarScheduled('u1', 'a', 'b'), todoKeys.calendarScheduled('u1', 'c', 'd')];
    const theirs: QueryKey = todoKeys.calendarScheduled('u2', 'a', 'b');
    [...mine, theirs].forEach((key) => client.setQueryData(key, []));

    await client.invalidateQueries({ queryKey: todoKeys.calendar('u1') });

    expect(mine.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual([true, true, true]);
    expect(client.getQueryState(theirs)?.isInvalidated).toBe(false);
  });

  it('defines the keys only in the registry', () => {
    const offenders = sources(join(ROOT, 'src'))
      .filter((file) => !file.endsWith(join('src', 'lib', 'queryKeys.ts')))
      .filter((file) => /['"`]calendar-todos-(?:inbox|scheduled)['"`]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  }, 30_000);
});
