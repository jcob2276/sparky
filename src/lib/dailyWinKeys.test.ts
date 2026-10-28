import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { todoKeys } from './queryKeys';

describe('daily win todo cache keys', () => {
  it('registers the shared live/prefetch key in the todo family', async () => {
    const client = new QueryClient();
    const keys = [todoKeys.dailyWins('owner', '2026-10-28'), todoKeys.dailyWins('owner', '2026-10-29')];
    keys.forEach(key => client.setQueryData(key, null));
    await client.invalidateQueries({ queryKey: todoKeys.all });
    expect(keys.map(key => client.getQueryState(key)?.isInvalidated)).toEqual([true, true]);
    expect(keys[0]).not.toEqual(todoKeys.dailyWins('other', '2026-10-28'));
  });
  it.each(['todo/todoApi.ts', 'workspacePrefetch.ts'])('%s uses the registry for the shared key', file => {
    const source = readFileSync(join(__dirname, file), 'utf8');
    expect(source).not.toMatch(/\[['"]todo['"],\s*['"]dailyWins['"]/);
  });
});
