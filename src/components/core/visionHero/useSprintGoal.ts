import { useState, useEffect, useRef } from 'react';
import { fetchSprintContext } from '../../../lib/goal/goalSpine';
import { useGoalSpineInvalidation } from '../../../hooks/useGoalSpineInvalidation';

/** Tekst celu bieżącego sprintu; odświeżany przy zmianie sprintu i po invalidacji goalSpine. */
export function useSprintGoal(userId: string | null | undefined, personalYear: number, sprintNumber: number): string | null {
  const [sprintGoal, setSprintGoal] = useState<string | null>(null);
  const loadRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    loadRef.current = () => {
      if (userId) void fetchSprintContext(userId).then((ctx) => setSprintGoal(ctx.goalText));
    };
    loadRef.current();
  }, [userId, personalYear, sprintNumber]);

  useGoalSpineInvalidation(() => loadRef.current());

  return sprintGoal;
}
