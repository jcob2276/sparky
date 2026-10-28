import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { biometricsKeys } from './queryKeys';

const ROOT = join(__dirname, '../..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('biometrics cache keys', () => {
  it('keeps running load, Oura baselines and sleep regularity in the biometrics family, so a health sync refreshes them', async () => {
    const client = new QueryClient();
    const keys: QueryKey[] = [
      biometricsKeys.runningLoad('u1', '2026-10-28'),
      biometricsKeys.ouraBaselines('u1', '2026-10-28'),
      biometricsKeys.sleepRegularity('u1', '2026-10-28'),
    ];
    keys.forEach((key) => client.setQueryData(key, {}));

    await client.invalidateQueries({ queryKey: biometricsKeys.all });

    expect(keys.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual([true, true, true]);
  });

  it('defines those keys only in the registry', () => {
    const literal = /['"`](?:running-load|oura-baselines|oura-sleep-regularity)['"`]/;
    const offenders = sources(join(ROOT, 'src'))
      .filter((file) => !file.endsWith(join('src', 'lib', 'queryKeys.ts')))
      .filter((file) => literal.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  }, 30_000);
});
