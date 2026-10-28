import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Dzień „dzisiaj” liczymy w Warszawie (`getTodayWarsaw` / `getWarsawDateString`), nie w UTC: po północy UTC daje wczorajszą datę. */
const ROOT = join(__dirname, '../..');
const SCAN = ['src', 'supabase/functions', 'packages/domain/src'];
const UTC_TODAY = /new Date\(\)\.toISOString\(\)\.(?:slice\(0, ?10\)|split\('T'\)\[0\])/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('dzień w strefie Warszawy', () => {
  it('żaden kod nie liczy dzisiejszej daty z UTC', () => {
    const offenders = SCAN.flatMap((dir) => sources(join(ROOT, dir)))
      .filter((file) => UTC_TODAY.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  }, 30_000); // skan całego kodu; w pełnym, równoległym zestawie potrafi przekroczyć domyślne 5 s
});
