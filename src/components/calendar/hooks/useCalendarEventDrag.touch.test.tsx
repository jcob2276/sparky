import { renderHook } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalRow } from '../calendarHelpers';
import { PX_PER_MIN } from '../calendarHelpers';
import { clearActionHistory, subscribeActionHistory, undoLastAction, type ActionHistorySnapshot } from '../../../lib/actionHistory';
import { LONG_PRESS_MS, TOUCH_CANCEL_PX } from '../calendarDragMath';
import { useCalendarEventDrag } from './useCalendarEventDrag';

const haptic = vi.hoisted(() => vi.fn());
vi.mock('../../../hooks/useHaptics', () => ({ haptics: { medium: haptic } }));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));

const event = {
  id: 'e1', event_id: 'e1', summary: 'Trening', category: 'cialo_trening',
  start_time: '2026-10-27T10:00:00+01:00', end_time: '2026-10-27T11:00:00+01:00',
} as unknown as CalRow;

function touchEvent(type: string, x: number, y: number) {
  const point = { clientX: x, clientY: y };
  return Object.assign(new Event(type, { cancelable: true, bubbles: true }), { touches: [point], changedTouches: [point] });
}

function setup() {
  const updateEventMutation = { mutateAsync: vi.fn(async () => ({ success: true })) };
  const onEventClick = vi.fn();
  const card = document.createElement('div');
  card.getBoundingClientRect = () => ({ top: 100, bottom: 400, left: 0, right: 100, width: 100, height: 300, x: 0, y: 100, toJSON: () => ({}) });
  const { result } = renderHook(() => useCalendarEventDrag({
    userId: 'u1', accessToken: 't', queryClient: new QueryClient(),
    visibleRange: { rangeStart: '2026-10-26', rangeEnd: '2026-11-01' },
    updateEventMutation, onEventClick, setToastMessage: vi.fn(),
  }));
  const touchStart = (y: number, action: 'move' | 'resize' = 'move') => result.current.handleEventMouseDown(event, {
    stopPropagation: vi.fn(), touches: [{ clientX: 10, clientY: y }], currentTarget: card,
  } as unknown as React.TouchEvent<HTMLDivElement>, action);
  return { updateEventMutation, onEventClick, touchStart };
}

beforeEach(() => {
  vi.useFakeTimers();
  haptic.mockClear();
  clearActionHistory();
  Object.defineProperty(document, 'elementFromPoint', { value: () => null, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('touch drag on a calendar event', () => {
  it('moves the event after a long press and snaps the result to 15 minutes', async () => {
    const { updateEventMutation, touchStart } = setup();
    touchStart(200);
    vi.advanceTimersByTime(LONG_PRESS_MS + 10);
    expect(haptic).toHaveBeenCalledTimes(1);

    const move = touchEvent('touchmove', 10, 200 + PX_PER_MIN * 30);
    document.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);

    const end = touchEvent('touchend', 10, 200 + PX_PER_MIN * 30);
    document.dispatchEvent(end);
    await vi.waitFor(() => expect(updateEventMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(end.defaultPrevented).toBe(true);
    expect(updateEventMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      event: expect.objectContaining({ id: 'e1', start: '2026-10-27T10:30:00+01:00', end: '2026-10-27T11:30:00+01:00' }),
    }));
  });

  it('resizes instead of moving when the hold starts at the bottom edge', async () => {
    const { updateEventMutation, touchStart } = setup();
    touchStart(395);
    vi.advanceTimersByTime(LONG_PRESS_MS + 10);
    document.dispatchEvent(touchEvent('touchmove', 10, 395 + PX_PER_MIN * 45));
    document.dispatchEvent(touchEvent('touchend', 10, 395 + PX_PER_MIN * 45));
    await vi.waitFor(() => expect(updateEventMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(updateEventMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      event: expect.objectContaining({ start: '2026-10-27T10:00:00+01:00', end: '2026-10-27T11:45:00+01:00' }),
    }));
  });

  it('leaves scrolling alone when the finger moves before the long press completes', () => {
    const { updateEventMutation, touchStart } = setup();
    touchStart(200);
    document.dispatchEvent(touchEvent('touchmove', 10, 200 + TOUCH_CANCEL_PX + 4));
    vi.advanceTimersByTime(LONG_PRESS_MS + 10);
    document.dispatchEvent(touchEvent('touchend', 10, 260));
    expect(haptic).not.toHaveBeenCalled();
    expect(updateEventMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('treats a quick tap as a tap: no drag session, no write', () => {
    const { updateEventMutation, onEventClick, touchStart } = setup();
    touchStart(200);
    vi.advanceTimersByTime(100);
    const end = touchEvent('touchend', 10, 200);
    document.dispatchEvent(end);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(end.defaultPrevented).toBe(false);
    expect(haptic).not.toHaveBeenCalled();
    expect(updateEventMutation.mutateAsync).not.toHaveBeenCalled();
    expect(onEventClick).not.toHaveBeenCalled();
  });

  it('can be undone through the shared history (⌘Z)', async () => {
    const { updateEventMutation, touchStart } = setup();
    touchStart(200);
    vi.advanceTimersByTime(LONG_PRESS_MS + 10);
    document.dispatchEvent(touchEvent('touchmove', 10, 200 + PX_PER_MIN * 30));
    document.dispatchEvent(touchEvent('touchend', 10, 200 + PX_PER_MIN * 30));
    // Akcja trafia do historii dopiero po udanym zapisie, więc czekamy na nią, a nie na samo wywołanie mutacji.
    let snapshot: ActionHistorySnapshot | null = null;
    const unsubscribe = subscribeActionHistory((next) => { snapshot = next; });
    await vi.waitFor(() => expect(snapshot?.undoLabel).toContain('Zmiana czasu'));
    unsubscribe();

    await undoLastAction();
    expect(updateEventMutation.mutateAsync).toHaveBeenLastCalledWith(expect.objectContaining({
      event: expect.objectContaining({ start: '2026-10-27T10:00:00+01:00', end: '2026-10-27T11:00:00+01:00' }),
    }));
  });
});
