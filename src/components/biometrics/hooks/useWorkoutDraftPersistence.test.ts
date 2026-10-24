import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutDraftPersistence } from './useWorkoutDraftPersistence';
import { loadWorkoutDraft, endWorkoutSession, markWorkoutSessionActive, type WorkoutDraft } from '../../../lib/health/workoutDraft';
const draft: WorkoutDraft = { workoutName: 'Bench', planWorkoutId: 'planned-session', exercises: [], activities: [], notes: '', sessionRpe: null,
  workoutDate: '2026-10-14', timerStart: null, manualTime: false, startTimeManual: '', endTimeManual: '', savedAt: 0 };
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });
describe('planned workout draft persistence', () => {
  it('persists the latest plan identity on debounce and backgrounding', () => {
    vi.useFakeTimers(); markWorkoutSessionActive('owner');
    const ended = { current: false };
    const { rerender } = renderHook(({ current }) => useWorkoutDraftPersistence('owner', current, ended), { initialProps: { current: draft } });
    act(() => vi.advanceTimersByTime(800));
    expect(loadWorkoutDraft('owner')?.planWorkoutId).toBe('planned-session');
    rerender({ current: { ...draft, notes: 'last set recorded' } });
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(loadWorkoutDraft('owner')?.notes).toBe('last set recorded');
  });
  it('does not resurrect a completed draft when the app backgrounds or a timer fires', () => {
    vi.useFakeTimers(); markWorkoutSessionActive('owner');
    const ended = { current: false };
    renderHook(() => useWorkoutDraftPersistence('owner', draft, ended));
    ended.current = true; endWorkoutSession('owner');
    act(() => { window.dispatchEvent(new Event('pagehide')); vi.advanceTimersByTime(1000); });
    expect(loadWorkoutDraft('owner')).toBeNull();
  });
});
