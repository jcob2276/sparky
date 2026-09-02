import { describe, expect, it } from 'vitest';
import { buildExerciseProgress, formatSetsLabel } from './exerciseProgress';
import type { ExerciseHistoryRow } from './workout';

function row(
  sessionId: string,
  date: string,
  setNumber: number,
  weight: number,
  reps: number,
  rir?: number,
): ExerciseHistoryRow {
  return {
    session_id: sessionId,
    set_number: setNumber,
    weight,
    reps,
    rir: rir ?? null,
    muscle_tags: ['triceps'],
    exercise_name: 'Dipy',
    workout_sessions: { date },
  };
}

describe('formatSetsLabel', () => {
  it('pokazuje BW zamiast 0 kg', () => {
    const label = formatSetsLabel([
      row('s1', '2026-09-02', 1, 0, 10),
      row('s1', '2026-09-02', 2, 7.5, 8),
    ]);
    expect(label).toContain('BW');
    expect(label).not.toMatch(/\b0 kg\b/);
  });
});

describe('buildExerciseProgress', () => {
  it('liczy deltę vs poprzednią sesję nie vs najstarszą', () => {
    const rows = [
      row('s2', '2026-08-31', 1, 30, 10, 2),
      row('s2', '2026-08-31', 2, 30, 10, 2),
      row('s1', '2026-08-26', 1, 25, 10),
      row('s1', '2026-08-26', 2, 30, 8),
    ];
    const summary = buildExerciseProgress('Pushdown na lince', rows, ['triceps']);
    expect(summary.e1rmDeltaVsPrev).toBeGreaterThan(0);
    expect(summary.insight).toContain('32.5');
  });

  it('wykrywa tryb bodyweight bez sugestii kg', () => {
    const rows = [
      row('s1', '2026-09-02', 1, 0, 10),
      row('s1', '2026-09-02', 2, 0, 8),
    ];
    const summary = buildExerciseProgress('Dipy', rows, ['triceps', 'klatka']);
    expect(summary.mode).toBe('bodyweight');
    expect(summary.suggestion).toBeNull();
    expect(summary.insight).toContain('BW');
  });
});
