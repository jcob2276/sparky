import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLoggedTime } from './useLoggedTime';

// 2026-10-23: 15:03 UTC = 17:03 Warsaw (CEST), 20:25 UTC = 22:25 Warsaw
const MORNING = new Date('2026-10-23T15:03:00Z');
const NIGHT = new Date('2026-10-23T20:25:00Z');

describe('useLoggedTime', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses the save moment, not the mount moment, when the user did not touch the time', () => {
    vi.setSystemTime(MORNING);
    const { result } = renderHook(() => useLoggedTime(true));
    expect(result.current.loggedTime).toBe('17:03');

    vi.setSystemTime(NIGHT);
    expect(result.current.resolveLoggedTime()).toBe('22:25');
  });

  it('keeps following the clock while an old draft stays open (the 14:08-at-21:31 bug)', () => {
    vi.setSystemTime(MORNING);
    const { result, rerender } = renderHook(({ size }) => useLoggedTime(true, size), {
      initialProps: { size: 1 },
    });
    expect(result.current.loggedTime).toBe('17:03');

    vi.setSystemTime(NIGHT);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.loggedTime).toBe('22:25');

    vi.setSystemTime(MORNING);
    rerender({ size: 2 });
    expect(result.current.loggedTime).toBe('17:03');
  });

  it('refreshes when the app returns to the foreground', () => {
    vi.setSystemTime(MORNING);
    const { result } = renderHook(() => useLoggedTime(true, 1));
    vi.setSystemTime(NIGHT);
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(result.current.loggedTime).toBe('22:25');
  });

  it('keeps a manually chosen time', () => {
    vi.setSystemTime(MORNING);
    const { result } = renderHook(() => useLoggedTime(true));
    act(() => result.current.setManualLoggedTime('12:30'));

    vi.setSystemTime(NIGHT);
    expect(result.current.resolveLoggedTime()).toBe('12:30');
  });

  it('starts a new draft with the current time and forgets the manual choice', () => {
    vi.setSystemTime(MORNING);
    const { result, rerender } = renderHook(({ hasDraft }) => useLoggedTime(hasDraft), {
      initialProps: { hasDraft: true },
    });
    act(() => result.current.setManualLoggedTime('12:30'));
    rerender({ hasDraft: false });

    vi.setSystemTime(NIGHT);
    rerender({ hasDraft: true });
    expect(result.current.loggedTime).toBe('22:25');
    expect(result.current.resolveLoggedTime()).toBe('22:25');
  });
});
