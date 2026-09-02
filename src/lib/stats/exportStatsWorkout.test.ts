import { expect, test } from 'vitest';
import { groupExerciseLogs } from './exportStatsWorkout';
import type { Tables } from '../database.types';

const log = (
  name: string,
  set: number,
  weight: number,
  reps: number
): Tables<'exercise_logs'> => ({
  id: `${name}-${set}`,
  exercise_name: name,
  set_number: set,
  weight,
  reps,
  created_at: null,
  is_pws_or_msp: null,
  muscle_tags: [],
  notes: null,
  rir: null,
  rpe: null,
  session_id: null,
  user_id: null,
});

test('groupExerciseLogs — łączy serie tego samego ćwiczenia w supersetach', () => {
  const grouped = groupExerciseLogs([
    log('Lat Pulldown', 1, 22.5, 8),
    log('OHP', 1, 40, 5),
    log('Lat Pulldown', 1, 27.5, 8),
    log('OHP', 1, 40, 5),
    log('Lat Pulldown', 1, 27.5, 9),
  ]);

  expect(grouped.length).toBe(2);
  expect(grouped[0].name).toBe('Lat Pulldown');
  expect(grouped[0].sets.length).toBe(3);
  expect(grouped[1].name).toBe('OHP');
  expect(grouped[1].sets.length).toBe(2);
});
