import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Pilnuje jednego źródła prawdy dla celów (docs/SINGLE_SOURCE.md): liczby celów ciała i dochodu mają być czytane z bazy
 * (`useLifeTargets`), a nie wpisywane do kodu ani promptów.
 */
const ROOT = join(__dirname, '../..');
const SCAN = ['src', 'supabase/functions', 'packages/domain/src'];
const ALLOWED = new Set(['src/lib/lifeGoals.ts']);
const GOAL_LITERAL = /\b\d{1,2}(?:[.,]\d)?\s?%\s?(?:BF|body ?fat)\b|\b\d{2,3}\s?kg\s+(?:bench|wyciskan)|\b\d{2}\s?000\s?zł\s+netto/i;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : [];
  });
}

describe('cele życiowe nie wracają do kodu', () => {
  it('brak wpisanych na sztywno liczb celu tłuszczu, wyciskania i dochodu', () => {
    const offenders = SCAN.flatMap((dir) => sources(join(ROOT, dir)))
      .map((file) => relative(ROOT, file))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => GOAL_LITERAL.test(readFileSync(join(ROOT, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
