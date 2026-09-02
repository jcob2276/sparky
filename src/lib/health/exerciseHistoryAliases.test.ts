import { describe, expect, it } from 'vitest';
import {
  canonicalExerciseName,
  historyNamesFor,
  matchedHistoryAlias,
} from './exerciseHistoryAliases';

describe('canonicalExerciseName', () => {
  it('normalizuje warianty do kanonicznej nazwy', () => {
    expect(canonicalExerciseName('Dips')).toBe('Dipy');
    expect(canonicalExerciseName('Pull-up')).toBe('Podciąganie nachwytem');
    expect(canonicalExerciseName('OHP')).toBe('OHP sztangą');
    expect(canonicalExerciseName('Hip Thrust')).toBe('Hip thrust');
  });

  it('zostawia nieznane nazwy bez zmian', () => {
    expect(canonicalExerciseName('Face pull')).toBe('Face pull');
  });
});

describe('historyNamesFor', () => {
  it('łączy wyciskanie płaskie ze sztangą na ławce', () => {
    const names = historyNamesFor('Wyciskanie płaskie');
    expect(names).toContain('Wyciskanie sztangi na ławce');
    expect(names).toContain('Wyciskanie płaskie');
  });

  it('łączy Dipy z Dips', () => {
    expect(historyNamesFor('Dipy')).toContain('Dips');
  });

  it('łączy OHP z OHP sztangą', () => {
    expect(historyNamesFor('OHP sztangą')).toContain('OHP');
  });

  it('zwraca samą nazwę bez aliasu', () => {
    expect(historyNamesFor('Face pull')).toEqual(['Face pull']);
  });
});

describe('matchedHistoryAlias', () => {
  it('pokazuje pod jaką nazwą zalogowano', () => {
    expect(
      matchedHistoryAlias('Wyciskanie płaskie', 'Wyciskanie sztangi na ławce'),
    ).toBe('Wyciskanie sztangi na ławce');
  });
});
