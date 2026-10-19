import { describe, expect, it } from 'vitest';
import { fuzzyMatch, rankTasks, splitByIndices, type RankableTask } from './todoPaletteSearch';

const task = (id: string, title: string, extra: Partial<RankableTask> = {}): RankableTask => ({
  id, title, tags: null, status: 'open', sectionName: null, due_date: null, ...extra,
});

describe('fuzzyMatch', () => {
  it('matches substrings and ignores case and Polish diacritics', () => {
    expect(fuzzyMatch('zolta', 'Żółta kartka')).not.toBeNull();
    expect(fuzzyMatch('ŁÓD', 'wyjazd do Łodzi')).not.toBeNull();
  });

  it('matches loose subsequences and rejects non-subsequences', () => {
    expect(fuzzyMatch('rpt', 'Raport kwartalny')).not.toBeNull();
    expect(fuzzyMatch('xyz', 'Raport kwartalny')).toBeNull();
  });

  it('requires every word of a multi-word query', () => {
    expect(fuzzyMatch('raport kwart', 'Raport kwartalny')).not.toBeNull();
    expect(fuzzyMatch('raport zebranie', 'Raport kwartalny')).toBeNull();
  });

  it('scores prefix matches above mid-word matches', () => {
    const prefix = fuzzyMatch('rap', 'Raport')?.score ?? 0;
    const inner = fuzzyMatch('por', 'Raport')?.score ?? 0;
    expect(prefix).toBeGreaterThan(inner);
  });

  it('returns indices mapped to the original text', () => {
    expect(fuzzyMatch('rap', 'Raport')?.indices).toEqual([0, 1, 2]);
  });

  it('treats an empty query as a trivial match', () => {
    expect(fuzzyMatch('  ', 'cokolwiek')).toEqual({ score: 0, indices: [] });
  });
});

describe('rankTasks', () => {
  const tasks = [
    task('a', 'Kupić mleko'),
    task('b', 'Mleko dla kota', { status: 'done' }),
    task('c', 'Spotkanie', { tags: ['mleczarnia'] }),
    task('d', 'Zadzwonić do banku', { sectionName: 'Finanse' }),
  ];

  it('returns nothing for an empty query', () => {
    expect(rankTasks('', tasks)).toEqual([]);
  });

  it('prefers title hits over tag hits and open over done', () => {
    const ids = rankTasks('mleko', tasks).map((r) => r.task.id);
    expect(ids[0]).toBe('a');
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
  });

  it('finds tasks by tag and by section name', () => {
    expect(rankTasks('mleczar', tasks).map((r) => r.task.id)).toContain('c');
    expect(rankTasks('finans', tasks).map((r) => r.task.id)).toEqual(['d']);
  });

  it('respects the limit', () => {
    expect(rankTasks('a', tasks, 2)).toHaveLength(2);
  });
});

describe('splitByIndices', () => {
  it('groups consecutive hits into segments', () => {
    expect(splitByIndices('Raport', [0, 1])).toEqual([
      { text: 'Ra', hit: true },
      { text: 'port', hit: false },
    ]);
  });
});
