import { describe, expect, it } from 'vitest';
import { HOUR_END, HOUR_START, PX_PER_MIN } from './calendarHelpers';
import {
  LONG_PRESS_MS, RESIZE_ZONE_PX, SNAP_MINUTES, TOUCH_CANCEL_PX,
  computeDraggedTimes, snapDeltaMinutes, touchDragAction,
} from './calendarDragMath';

describe('snapDeltaMinutes', () => {
  it('snaps a pixel delta to 15 minute steps', () => {
    expect(snapDeltaMinutes(0)).toBe(0);
    expect(snapDeltaMinutes(PX_PER_MIN * 15)).toBe(15);
    expect(snapDeltaMinutes(PX_PER_MIN * 22)).toBe(15);
    expect(snapDeltaMinutes(PX_PER_MIN * 23)).toBe(30);
    expect(snapDeltaMinutes(-PX_PER_MIN * 40)).toBe(-45);
  });
});

describe('computeDraggedTimes', () => {
  const base = { startMin: 10 * 60, endMin: 11 * 60 };

  it('moves the whole event and keeps its length', () => {
    expect(computeDraggedTimes({ action: 'move', ...base, diffMins: 30 })).toEqual({ startMin: 10 * 60 + 30, endMin: 11 * 60 + 30 });
  });

  it('never moves the event outside the visible day', () => {
    const early = computeDraggedTimes({ action: 'move', ...base, diffMins: -24 * 60 });
    expect(early.startMin).toBe(HOUR_START * 60);
    expect(early.endMin - early.startMin).toBe(60);
    const late = computeDraggedTimes({ action: 'move', ...base, diffMins: 24 * 60 });
    expect(late.endMin).toBe(HOUR_END * 60);
    expect(late.endMin - late.startMin).toBe(60);
  });

  it('resizes only the end and keeps the minimum length', () => {
    expect(computeDraggedTimes({ action: 'resize', ...base, diffMins: 45 })).toEqual({ startMin: 10 * 60, endMin: 11 * 60 + 45 });
    expect(computeDraggedTimes({ action: 'resize', ...base, diffMins: -24 * 60 })).toEqual({ startMin: 10 * 60, endMin: 10 * 60 + SNAP_MINUTES });
    expect(computeDraggedTimes({ action: 'resize', ...base, diffMins: 24 * 60 }).endMin).toBe(HOUR_END * 60);
  });
});

describe('touchDragAction', () => {
  it('turns a hold near the bottom edge into a resize and leaves the rest as move', () => {
    expect(touchDragAction('move', 400, 400 - RESIZE_ZONE_PX)).toBe('resize');
    expect(touchDragAction('move', 400, 385)).toBe('resize');
    expect(touchDragAction('move', 400, 400 - RESIZE_ZONE_PX - 1)).toBe('move');
    expect(touchDragAction('move', 400, 200)).toBe('move');
  });

  it('keeps an explicit resize request from the handle', () => {
    expect(touchDragAction('resize', 400, 100)).toBe('resize');
  });
});

describe('gesture constants', () => {
  it('keep scrolling cheap and long press deliberate', () => {
    expect(LONG_PRESS_MS).toBeGreaterThanOrEqual(250);
    expect(LONG_PRESS_MS).toBeLessThanOrEqual(500);
    expect(TOUCH_CANCEL_PX).toBeGreaterThanOrEqual(6);
  });
});
