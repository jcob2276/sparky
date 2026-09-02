import { describe, expect, it } from 'vitest';
import { classifyMovement, incrementKg } from './progressionRules';
import { computeWeightSuggestion } from './progression';

describe('classifyMovement', () => {
  it('klasyfikuje bench jako barbell_small', () => {
    expect(classifyMovement('Wyciskanie płaskie', ['klatka'])).toBe('barbell_small');
  });

  it('klasyfikuje przysiad jako barbell_large', () => {
    expect(classifyMovement('Przysiad', ['quady'])).toBe('barbell_large');
  });
});

describe('computeWeightSuggestion', () => {
  it('dodaje 2.5 kg po dobrej sesji bench', () => {
    const s = computeWeightSuggestion(
      [
        { weight: 100, reps: 8, rir: 2, set_number: 1, session_id: 'a' },
        { weight: 100, reps: 8, rir: 1, set_number: 2, session_id: 'a' },
        { weight: 100, reps: 8, rir: 1, set_number: 3, session_id: 'a' },
      ],
      'Wyciskanie płaskie',
      ['klatka'],
    );
    expect(s?.action).toBe('progress');
    expect(s?.suggestedWeight).toBe(102.5);
  });

  it('dodaje 5 kg po dobrej sesji przysiadu', () => {
    const s = computeWeightSuggestion(
      [
        { weight: 100, reps: 5, rir: 2, set_number: 1, session_id: 'a' },
        { weight: 100, reps: 5, rir: 2, set_number: 2, session_id: 'a' },
      ],
      'Przysiad',
      ['quady'],
    );
    expect(s?.suggestedWeight).toBe(105);
    expect(incrementKg('barbell_large')).toBe(5);
  });

  it('trzyma ciężar przy nierównych powtórzeniach', () => {
    const s = computeWeightSuggestion(
      [
        { weight: 100, reps: 8, rir: 2, set_number: 1, session_id: 'a' },
        { weight: 100, reps: 6, rir: 1, set_number: 2, session_id: 'a' },
        { weight: 100, reps: 5, rir: 0, set_number: 3, session_id: 'a' },
      ],
      'Wyciskanie płaskie',
    );
    expect(s?.action).toBe('hold');
    expect(s?.suggestedWeight).toBe(100);
  });
});
