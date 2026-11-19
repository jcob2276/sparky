import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { syncWorkoutActivity } from '../../../lib/native/workoutActivity';
import { useWorkoutActivity } from './useWorkoutActivity';

vi.mock('../../../lib/native/workoutActivity', () => ({ syncWorkoutActivity: vi.fn() }));

it('shows the workout timer alone, adds rest, and ends on unmount', () => {
  const now = Date.now();
  const rest = { startedAt: now, endsAt: now + 60_000, exercise: 'Przysiad', nextSet: 2 };
  const { rerender, unmount } = renderHook(({ r }) => useWorkoutActivity(now - 5000, r), { initialProps: { r: null as typeof rest | null } });
  expect(syncWorkoutActivity).toHaveBeenLastCalledWith({ workoutStartedAt: now - 5000, rest: undefined });
  rerender({ r: rest });
  expect(syncWorkoutActivity).toHaveBeenLastCalledWith({ workoutStartedAt: now - 5000, rest });
  unmount();
  expect(syncWorkoutActivity).toHaveBeenLastCalledWith(null);
});
