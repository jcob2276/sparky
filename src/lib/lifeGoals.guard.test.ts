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
const GOAL_LITERAL = new RegExp([
  String.raw`\b\d{1,2}(?:[.,]\d)?\s?%\s?(?:BF|body ?fat)\b`,
  String.raw`\b\d{2,3}\s?kg\s+(?:bench|wyciskan)`,
  String.raw`\b\d{2}\s?000\s?zł\s+netto`,
  // cel sprzedażowy i „statystyki” wpisane z głowy (raport rozjazdów 2026-10-25)
  String.raw`\b\d{1,3}\s?%\s?close ?rate|close ?rate:?\s?\d{1,3}\s?%`,
  String.raw`\bw \d{1,3}\s?% przypadków`,
].join('|'), 'i');

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

describe('tabela właścicieli w SINGLE_SOURCE.md', () => {
  it('każdy hook i funkcja wskazane w kolumnie „Jak czytać” istnieją w kodzie', () => {
    const doc = readFileSync(join(ROOT, 'docs/SINGLE_SOURCE.md'), 'utf8');
    const table = doc.slice(doc.indexOf('## Cele i parametry osobiste'), doc.indexOf('## Definicje i progi'));
    const names = [...new Set([...table.matchAll(/`((?:use|derive|fetch)[A-Za-z]+)\(/g)].map((m) => m[1]))];
    const code = SCAN.flatMap((dir) => sources(join(ROOT, dir))).map((file) => readFileSync(file, 'utf8')).join('\n');
    const missing = names.filter((name) => !new RegExp(String.raw`export (?:async )?function ${name}\b|export const ${name}\b`).test(code));
    expect(names.length).toBeGreaterThan(3);
    expect(missing).toEqual([]);
  }, 30_000); // skan całego kodu; w pełnym, równoległym zestawie potrafi przekroczyć domyślne 5 s

  it('pola useLifeTargets() wymienione w tabeli są w typie LifeTargets', () => {
    const doc = readFileSync(join(ROOT, 'docs/SINGLE_SOURCE.md'), 'utf8');
    const fields = [...doc.matchAll(/`useLifeTargets\([^)]*\)\.(\w+)/g)].map((m) => m[1]);
    const lifeGoals = readFileSync(join(ROOT, 'src/lib/lifeGoals.ts'), 'utf8');
    expect(fields.filter((field) => !new RegExp(String.raw`\b${field}\s*:`).test(lifeGoals))).toEqual([]);
  });
});
