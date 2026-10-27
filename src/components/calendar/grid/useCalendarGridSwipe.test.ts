import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCalendarGridSwipe } from './useCalendarGridSwipe';

function touch(x: number, y: number) {
  const point = { clientX: x, clientY: y };
  return { touches: [point], changedTouches: [point], target: document.createElement('div') } as unknown as React.TouchEvent<HTMLDivElement>;
}

function setup() {
  const setSelectedDay = vi.fn();
  const setWeekStart = vi.fn();
  const { result } = renderHook(() => useCalendarGridSwipe({
    calView: 'dzien', selectedDay: '2026-10-27', weekStart: '2026-10-26', setSelectedDay, setWeekStart,
  }));
  return { result, setSelectedDay };
}

afterEach(() => { delete document.body.dataset.calendarDragging; });

describe('useCalendarGridSwipe', () => {
  it('changes the day on a clear horizontal swipe', () => {
    const { result, setSelectedDay } = setup();
    result.current.onTouchStart(touch(300, 200));
    result.current.onTouchEnd(touch(150, 205));
    expect(setSelectedDay).toHaveBeenCalledWith('2026-10-28');
  });

  it('ignores the touchend that finishes dragging an event', () => {
    const { result, setSelectedDay } = setup();
    result.current.onTouchStart(touch(300, 200));
    document.body.dataset.calendarDragging = 'true';
    result.current.onTouchEnd(touch(120, 205));
    expect(setSelectedDay).not.toHaveBeenCalled();
    expect(result.current.consumeSwipe()).toBe(false);
  });

  it('ignores vertical gestures', () => {
    const { result, setSelectedDay } = setup();
    result.current.onTouchStart(touch(300, 200));
    result.current.onTouchEnd(touch(180, 320));
    expect(setSelectedDay).not.toHaveBeenCalled();
  });
});
