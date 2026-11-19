import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCalendarGridSwipe } from './useCalendarGridSwipe';

function touch(x: number, y: number, target = document.createElement('div')) {
  const point = { clientX: x, clientY: y };
  return { touches: [point], changedTouches: [point], target } as unknown as React.TouchEvent<HTMLDivElement>;
}

function setup() {
  const setSelectedDay = vi.fn();
  const onHold = vi.fn();
  const setWeekStart = vi.fn();
  const { result } = renderHook(() => useCalendarGridSwipe({
    calView: 'dzien', selectedDay: '2026-10-27', setSelectedDay, setWeekStart, onHold,
  }));
  return { result, setSelectedDay, onHold };
}

afterEach(() => { delete document.body.dataset.calendarDragging; vi.useRealTimers(); });

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
  });

  it('ignores vertical gestures', () => {
    const { result, setSelectedDay } = setup();
    result.current.onTouchStart(touch(300, 200));
    result.current.onTouchEnd(touch(180, 320));
    expect(setSelectedDay).not.toHaveBeenCalled();
  });
});

it('opens an empty time slot after a hold and never switches days for that gesture', () => {
  vi.useFakeTimers();
  const { result, setSelectedDay, onHold } = setup();
  const column = document.createElement('div');
  column.dataset.dayCol = '2026-10-27';
  result.current.onTouchStart(touch(300, 200, column));
  vi.advanceTimersByTime(449);
  expect(onHold).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(onHold).toHaveBeenCalledWith('2026-10-27', expect.any(Number));
  result.current.onTouchEnd(touch(150, 205, column));
  expect(setSelectedDay).not.toHaveBeenCalled();
});

it('cancels the hold when the finger moves and swipes to the previous day', () => {
  vi.useFakeTimers();
  const { result, setSelectedDay, onHold } = setup();
  const column = document.createElement('div');
  column.dataset.dayCol = '2026-10-27';
  result.current.onTouchStart(touch(150, 200, column));
  result.current.onTouchMove(touch(185, 205, column));
  vi.advanceTimersByTime(500);
  result.current.onTouchEnd(touch(300, 205, column));
  expect(onHold).not.toHaveBeenCalled();
  expect(setSelectedDay).toHaveBeenCalledWith('2026-10-26');
});
