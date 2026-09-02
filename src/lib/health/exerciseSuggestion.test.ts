import { describe, expect, it } from 'vitest';
import {
  computeExerciseSuggestion,
  computeRepsSuggestion,
  formatSuggestionShort,
} from './exerciseSuggestion';
import { fillAllSetsFromHistory, formatHistorySetLabel } from './workoutSetFill';
import { newSet } from './workout';
import type { ExerciseHistoryRow } from './workout';

function row(
  setNumber: number,
  weight: number,
  reps: number,
  rir?: number,
): ExerciseHistoryRow {
  return {
    set_number: setNumber,
    weight,
    reps,
    rir: rir ?? null,
    session_id: 's1',
    muscle_tags: ['triceps'],
    exercise_name: 'Dipy',
  };
}

describe('computeRepsSuggestion', () => {
  it('sugeruje +1 powt. przy dobrym RIR', () => {
    const s = computeRepsSuggestion([
      row(1, 0, 10, 2),
      row(2, 0, 10, 2),
    ]);
    expect(s?.action).toBe('progress');
    expect(s?.suggestedReps).toBe(11);
  });
});

describe('computeExerciseSuggestion', () => {
  it('dipy z beltem → sugestia kg', () => {
    const s = computeExerciseSuggestion(
      [
        row(1, 0, 10),
        row(2, 7.5, 8, 2),
        row(3, 7.5, 9, 2),
      ],
      'Dipy',
      ['triceps'],
    );
    expect(s?.mode).toBe('belt');
    if (s?.mode === 'belt') expect(s.weight.suggestedWeight).toBe(10);
  });

  it('dipy czyste BW → sugestia powtórzeń', () => {
    const s = computeExerciseSuggestion(
      [row(1, 0, 10, 2), row(2, 0, 10, 2)],
      'Dipy',
    );
    expect(s?.mode).toBe('reps');
    expect(formatSuggestionShort(s!)).toContain('powt.');
  });
});

describe('workoutSetFill', () => {
  it('wypełnia serie z historii', () => {
    const filled = fillAllSetsFromHistory([newSet()], [
      row(1, 7.5, 8, 2),
      row(2, 7.5, 9, 2),
    ]);
    expect(filled).toHaveLength(2);
    expect(filled[0].kg).toBe('7.5');
    expect(filled[0].reps).toBe('8');
  });

  it('formatuje BW w etykiecie', () => {
    expect(formatHistorySetLabel(row(1, 0, 10, 2))).toBe('BW×10 @2');
  });
});
