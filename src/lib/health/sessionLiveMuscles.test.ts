import { describe, expect, it } from 'vitest';
import { sessionLiveFatigue, sessionLiveHitCount } from './sessionLiveMuscles';
import type { WorkoutExercise } from './workout';

function ex(partial: Partial<WorkoutExercise> & Pick<WorkoutExercise, 'id' | 'name'>): WorkoutExercise {
  return {
    tags: [],
    sets: [],
    ...partial,
  };
}

describe('sessionLiveMuscles', () => {
  it('ignores incomplete sets and wellness', () => {
    const fatigue = sessionLiveFatigue([
      ex({
        id: 1,
        name: 'Bench',
        tags: ['klatka', 'triceps'],
        sets: [
          { id: 1, kg: '100', reps: '5', rir: '2', msp: false, done: true },
          { id: 2, kg: '100', reps: '5', rir: '2', msp: false, done: false },
        ],
      }),
      ex({
        id: 2,
        name: 'Sauna',
        tags: ['wellness'],
        sets: [{ id: 3, kg: '0', reps: '20', rir: '', msp: false, done: true }],
      }),
    ]);
    expect(fatigue.klatka).toBeGreaterThan(0);
    expect(fatigue.triceps).toBeGreaterThan(0);
    expect(fatigue.wellness).toBeUndefined();
    expect(sessionLiveHitCount([
      ex({
        id: 1,
        name: 'Bench',
        tags: ['klatka'],
        sets: [{ id: 1, kg: '100', reps: '5', rir: '', msp: false, done: true }],
      }),
    ])).toBe(1);
  });

  it('stays empty until a set is checked', () => {
    expect(
      sessionLiveFatigue([
        ex({
          id: 1,
          name: 'Squat',
          tags: ['czworogłowe'],
          sets: [{ id: 1, kg: '100', reps: '5', rir: '', msp: false }],
        }),
      ]),
    ).toEqual({});
  });
});
