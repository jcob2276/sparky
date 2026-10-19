import { describe, expect, it } from 'vitest';
import {
  exerciseMatchesQuery,
  queryResolvesToCatalog,
  resolveExercisePickName,
  scoreExerciseMatch,
} from './exerciseSearch';

describe('exerciseMatchesQuery', () => {
  it('łączy bench press z Wyciskanie płaskie', () => {
    expect(exerciseMatchesQuery('Wyciskanie płaskie', 'bench press')).toBe(true);
    expect(exerciseMatchesQuery('Wyciskanie płaskie', 'Bench Press')).toBe(true);
  });

  it('łączy pull-up z Podciąganie nachwytem', () => {
    expect(exerciseMatchesQuery('Podciąganie nachwytem', 'pull-up')).toBe(true);
  });
});

describe('scoreExerciseMatch', () => {
  it('stawia barbell bench nad band bench dla „bench press”', () => {
    const q = 'bench press';
    expect(scoreExerciseMatch('Barbell bench press', q)).toBeGreaterThan(
      scoreExerciseMatch('Band bench press', q),
    );
  });

  it('stawia kanoniczne Wyciskanie płaskie wysoko dla „bench press”', () => {
    const q = 'bench press';
    expect(scoreExerciseMatch('Wyciskanie płaskie', q)).toBeGreaterThan(
      scoreExerciseMatch('Barbell incline bench press', q),
    );
  });
});

describe('queryResolvesToCatalog', () => {
  it('nie proponuje własnej nazwy gdy jest alias + wynik', () => {
    expect(queryResolvesToCatalog('bench press', ['Wyciskanie płaskie', 'Barbell bench press'])).toBe(
      true,
    );
  });
});

describe('resolveExercisePickName', () => {
  it('kanonizuje EN do PL', () => {
    expect(resolveExercisePickName('bench press')).toBe('Wyciskanie płaskie');
    expect(resolveExercisePickName('Barbell bench press')).toBe('Wyciskanie płaskie');
    expect(resolveExercisePickName('Pull-up')).toBe('Podciąganie nachwytem');
  });
});
