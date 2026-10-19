import { describe, expect, it } from 'vitest';
import type { WorkoutExercise, WorkoutSet } from '../workout/workoutUtils';
import { autoWorkoutName, defaultRestSeconds, ghostFor, summarize, warmupRamp } from './liveWorkoutUtils';

const set = (patch: Partial<WorkoutSet>): WorkoutSet => ({ id: Math.random(), kg: '', reps: '', rir: '', msp: false, ...patch });
const exercise = (name: string, tags: string[], sets: WorkoutSet[]): WorkoutExercise => ({ id: Math.random(), name, tags, sets });

describe('warmupRamp', () => {
  it('builds a 40/60/80% ramp rounded to 2.5 kg', () => {
    expect(warmupRamp(100)).toEqual([
      { kg: '40', reps: '8' },
      { kg: '60', reps: '5' },
      { kg: '80', reps: '3' },
    ]);
  });
  it('returns nothing for a light working weight', () => {
    expect(warmupRamp(30)).toEqual([]);
  });
});

describe('summarize and naming', () => {
  const session = [
    exercise('Wyciskanie płaskie', ['klatka', 'triceps'], [set({ kg: '80', reps: '8', done: true }), set({ kg: '80', reps: '8', done: true }), set({ kg: '40', reps: '8', done: true, type: 'warmup' })]),
    exercise('Dipy', ['triceps', 'klatka'], [set({})]),
  ];
  it('counts only logged working sets and sums volume', () => {
    expect(summarize(session)).toMatchObject({ sets: 2, exercises: 1, volumeKg: 1280 });
  });
  it('names the session after the most trained muscles', () => {
    expect(autoWorkoutName(session)).toBe('Klatka · Triceps');
    expect(autoWorkoutName([])).toBe('Trening');
  });
});

describe('ghost values and rest', () => {
  it('uses the last session value for extra sets', () => {
    const rows = [{ weight: 50, reps: 10 }, { weight: 60, reps: 8 }] as Parameters<typeof ghostFor>[0];
    expect(ghostFor(rows, 0)).toEqual({ kg: '50', reps: '10' });
    expect(ghostFor(rows, 5)).toEqual({ kg: '60', reps: '8' });
    expect(ghostFor([], 0)).toBeNull();
  });
  it('rests longer after compound lifts', () => {
    expect(defaultRestSeconds('Martwy ciąg')).toBe(120);
    expect(defaultRestSeconds('Wznosy bokiem')).toBe(75);
  });
});
