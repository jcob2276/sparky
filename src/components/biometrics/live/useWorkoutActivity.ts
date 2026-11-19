import { useEffect } from 'react';
import { syncWorkoutActivity, type WorkoutRestState } from '../../../lib/native/workoutActivity';

/** Live Activity / Dynamic Island: czas całego treningu, a w przerwie dodatkowo jej odliczanie. */
export function useWorkoutActivity(workoutStartedAt: number | null, rest: WorkoutRestState | null) {
  const { startedAt, endsAt, exercise, nextSet } = rest ?? {};

  useEffect(() => {
    if (workoutStartedAt == null) return;
    const activeRest = startedAt != null && endsAt != null && exercise != null && endsAt > Date.now()
      ? { startedAt, endsAt, exercise, nextSet }
      : undefined;
    syncWorkoutActivity({ workoutStartedAt, rest: activeRest });
  }, [workoutStartedAt, startedAt, endsAt, exercise, nextSet]);

  useEffect(() => () => syncWorkoutActivity(null), []);
}
