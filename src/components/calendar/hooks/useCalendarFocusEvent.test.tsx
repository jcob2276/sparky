import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOCUS_PULSE_MS, useCalendarFocusEvent } from './useCalendarFocusEvent';

function addCard(id: string) {
  const el = document.createElement('div');
  el.setAttribute('data-event-id', id);
  el.scrollIntoView = vi.fn();
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom nie ma CSS.escape ani requestAnimationFrame w trybie fake timers: ustawiamy na timery.
  vi.stubGlobal('CSS', { escape: (value: string) => value });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('useCalendarFocusEvent', () => {
  it('scrolls to the event, highlights it, then clears the highlight and reports done', () => {
    const card = addCard('ev-1');
    const onDone = vi.fn();
    renderHook(() => useCalendarFocusEvent('ev-1', onDone));

    vi.advanceTimersByTime(50);
    expect(card.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
    expect(card.classList.contains('calendar-event-pulse')).toBe(true);
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(FOCUS_PULSE_MS + 20);
    expect(card.classList.contains('calendar-event-pulse')).toBe(false);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('waits for the block to render after the day changes', () => {
    const onDone = vi.fn();
    renderHook(() => useCalendarFocusEvent('late', onDone));
    vi.advanceTimersByTime(100);
    const card = addCard('late');
    vi.advanceTimersByTime(100);
    expect(card.classList.contains('calendar-event-pulse')).toBe(true);
  });

  it('gives up quietly when the event never appears', () => {
    const onDone = vi.fn();
    renderHook(() => useCalendarFocusEvent('missing', onDone));
    vi.advanceTimersByTime(2000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does nothing without an event id', () => {
    const onDone = vi.fn();
    renderHook(() => useCalendarFocusEvent(null, onDone));
    vi.advanceTimersByTime(2000);
    expect(onDone).not.toHaveBeenCalled();
  });
});
