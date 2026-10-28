import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { medicalKeys } from './queryKeys';

const ROOT = join(__dirname, '../..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('medicalKeys.preventionActions', () => {
  it('is scoped to a user', () => {
    expect(medicalKeys.preventionActions('u1')).not.toEqual(medicalKeys.preventionActions('u2'));
  });

  it('is the only definition of the prevention-actions cache key, so every reader and writer shares it', () => {
    const offenders = sources(join(ROOT, 'src'))
      .filter((file) => !file.endsWith(join('src', 'lib', 'queryKeys.ts')))
      .filter((file) => /['"`](?:medical-)?prevention-actions['"`]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  }, 30_000);
});
