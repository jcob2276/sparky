/**
 * @file workoutNlApi.ts
 * @role Integracja z edge function parse-workout-nl — parsuje język naturalny na ćwiczenia, serie i powtórzenia.
 */
import { invokeEdge } from '../supabase';
import {
  newExercise,
  newSet,
  newActivity,
  type WorkoutExercise,
  type WorkoutActivity,
} from './workout';

export interface ParsedWorkoutResult {
  workoutName?: string;
  exercises: WorkoutExercise[];
  activities: WorkoutActivity[];
}

export async function parseWorkoutNl(text: string): Promise<ParsedWorkoutResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { exercises: [newExercise()], activities: [] };
  }

  const res = await invokeEdge('parse-workout-nl', {
    body: { text: trimmed },
  });

  const exercises: WorkoutExercise[] = (res.exercises || []).map((ex) => {
    const rawSets = ex.sets || [];
    const sets = rawSets.flatMap((s) => {
      const count = Math.max(1, s.count ?? 1);
      return Array.from({ length: count }, () => ({
        ...newSet('working'),
        kg: s.kg != null && s.kg > 0 ? String(s.kg) : '',
        reps: s.reps != null && s.reps > 0 ? String(s.reps) : '',
        rir: s.rir != null ? String(s.rir) : '',
      }));
    });

    return {
      id: Date.now() + Math.random(),
      name: ex.name,
      tags: ex.tags || [],
      sets: sets.length > 0 ? sets : [newSet('working')],
    };
  });

  const activities: WorkoutActivity[] = (res.activities || []).map((act) => ({
    ...newActivity(),
    name: act.name,
    min: act.minutes ? String(act.minutes) : '',
    note: act.note || '',
  }));

  return {
    workoutName: res.workout_name,
    exercises: exercises.length > 0 ? exercises : [newExercise()],
    activities,
  };
}
