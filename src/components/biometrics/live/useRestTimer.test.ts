import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { syncWorkoutRestActivity } from '../../../lib/native/workoutRestActivity';
import { useRestTimer } from './useRestTimer';

vi.mock('../../../lib/native/workoutRestActivity', () => ({ syncWorkoutRestActivity: vi.fn() }));
vi.mock('../../../hooks/useHaptics', () => ({ useHaptics: () => ({ success: vi.fn() }) }));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

it('uses the same start and deadline for the in-app timer and Live Activity', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-19T10:00:00Z'));
  const startedAt = Date.now();
  const { result } = renderHook(useRestTimer);

  act(() => result.current.start(90, { exercise: 'Przysiad', nextSet: 2 }));
  expect(syncWorkoutRestActivity).toHaveBeenLastCalledWith({
    startedAt, endsAt: startedAt + 90_000, exercise: 'Przysiad', nextSet: 2,
  });

  act(() => result.current.adjust(15));
  expect(syncWorkoutRestActivity).toHaveBeenLastCalledWith({
    startedAt, endsAt: startedAt + 105_000, exercise: 'Przysiad', nextSet: 2,
  });

  act(() => result.current.skip());
  expect(syncWorkoutRestActivity).toHaveBeenLastCalledWith(null);
});

it('clears the Live Activity when the rest finishes', () => {
  vi.useFakeTimers();
  const { result } = renderHook(useRestTimer);
  act(() => result.current.start(1, { exercise: 'Przysiad' }));
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.finished).toBe(true);
  expect(syncWorkoutRestActivity).toHaveBeenLastCalledWith(null);
});
