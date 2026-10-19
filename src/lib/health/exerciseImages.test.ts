import { describe, expect, it } from 'vitest';
import index from '../../data/exerciseImageIndex.json';
import { POLISH_TO_ENGLISH, polishNamesMissingFromIndex } from './exerciseImages';
import { EXERCISES, normalize } from '../../data/exercises';

describe('exercise image mapping', () => {
  it('points every mapped Polish exercise at a name that exists in the image index', () => {
    expect(polishNamesMissingFromIndex(index)).toEqual([]);
  });

  it('covers the standard strength exercises from the log list', () => {
    const covered = new Set(Object.keys(POLISH_TO_ENGLISH).map(normalize));
    const strength = EXERCISES.filter((e) => !e.tags.some((t) => ['plyo', 'wellness'].includes(t)));
    const missing = strength.filter((e) => !covered.has(normalize(e.name))).map((e) => e.name);
    expect(missing).toEqual([]);
  });
});
