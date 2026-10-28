import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx?$/.test(file) && !file.includes('.test.') ? [file] : [];
  });
}

describe('daily win read boundary', () => {
  it('keeps all daily win table operations in dailyWinTasksApi', () => {
    const forbidden = sources(root)
      .filter(file => !file.endsWith('dailyWinTasksApi.ts'))
      .filter(file => /\.from\(\s*['"]daily_(?:wins|win_tasks)['"]\s*\)/.test(readFileSync(file, 'utf8')))
      .map(file => relative(root, file));
    expect(forbidden).toEqual([]);
  });

  // Only direct read queries: insert/update/upsert(...).select(...) are deliberately excluded.
  for (const file of sources(root)) {
    const source = readFileSync(file, 'utf8');
    const selects = [...source.matchAll(/\.from\(['"](daily_wins|daily_win_tasks)['"]\)\s*\.select\(['"]([^'"]*)['"]/g)];
    if ((!selects.length && !source.includes("from './dailyWinTasksApi'") && !source.includes('/dailyWinTasksApi\''))
      || file.endsWith('dailyWinTasksApi.ts')) continue;
    it(`${relative(root, file)} reads slots only through dailyWinTasksApi`, () => {
      const forbidden = selects.filter(([, table, columns]) => table === 'daily_win_tasks'
        || columns.includes('*') || columns.includes('daily_win_tasks')
        || /(?:task|done|category|completed_at)_[1-5]/.test(columns));
      expect(forbidden.map(match => match[0])).toEqual([]);
    });
  }
});
