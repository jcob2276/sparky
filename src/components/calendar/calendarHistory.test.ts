import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearActionHistory, redoLastAction, undoLastAction } from '../../lib/actionHistory';
import {
  createEventWithHistory, recordCalendarCreate, recordCalendarDelete, recordCalendarUpdate, rowToEventPayload,
  type CalendarWriters,
} from './calendarHistory';
import type { CalRow } from './calendarHelpers';

function writers(): CalendarWriters & { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> } {
  let counter = 0;
  return {
    create: vi.fn(async () => `new-${++counter}`),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

const event = { summary: 'Trening', start: '2026-10-27T10:00:00+01:00', end: '2026-10-27T11:00:00+01:00' };

beforeEach(() => clearActionHistory());

describe('recordCalendarUpdate', () => {
  it('undo restores the original event and redo applies the change again', async () => {
    const w = writers();
    const before = { id: 'e1', ...event };
    const after = { id: 'e1', ...event, start: '2026-10-27T12:00:00+01:00', end: '2026-10-27T13:00:00+01:00' };
    recordCalendarUpdate(w, { label: 'Zmiana czasu', before, after });

    await undoLastAction();
    expect(w.update).toHaveBeenLastCalledWith(before);
    await redoLastAction();
    expect(w.update).toHaveBeenLastCalledWith(after);
  });
});

describe('recordCalendarDelete', () => {
  it('undo recreates the event and redo deletes the recreated one, not the old id', async () => {
    const w = writers();
    recordCalendarDelete(w, { label: 'Usunięcie', event });

    await undoLastAction();
    expect(w.create).toHaveBeenCalledWith(event);
    await redoLastAction();
    expect(w.remove).toHaveBeenCalledWith('new-1');

    await undoLastAction();
    await redoLastAction();
    expect(w.remove).toHaveBeenLastCalledWith('new-2');
  });
});

describe('recordCalendarCreate', () => {
  it('undo removes the created event and redo recreates it under a new id', async () => {
    const w = writers();
    recordCalendarCreate(w, { label: 'Duplikat', event, createdId: 'created-1' });

    await undoLastAction();
    expect(w.remove).toHaveBeenLastCalledWith('created-1');
    await redoLastAction();
    expect(w.create).toHaveBeenCalledWith(event);
    await undoLastAction();
    expect(w.remove).toHaveBeenLastCalledWith('new-1');
  });
});

describe('createEventWithHistory', () => {
  it('creates the event and lets ⌘Z remove exactly that event', async () => {
    const w = writers();
    expect(await createEventWithHistory(w, event)).toEqual(expect.any(String));
    await undoLastAction();
    expect(w.remove).toHaveBeenCalledWith('new-1');
  });

  it('does not register a series, which a single delete cannot undo', async () => {
    const w = writers();
    expect(await createEventWithHistory(w, event, false)).toBeNull();
    expect(w.create).toHaveBeenCalledTimes(1);
    expect(await undoLastAction()).toBe(false);
  });
});

describe('rowToEventPayload', () => {
  const row = {
    id: 'r', summary: 'Rozmowa', start_time: event.start, end_time: event.end, category: 'praca',
    description: 'opis', location: 'Biuro', is_all_day: false, reminder_minutes: 15, recurrence: null,
  } as unknown as CalRow;

  it('keeps every field needed to recreate the event', () => {
    expect(rowToEventPayload(row)).toEqual({
      summary: 'Rozmowa', start: event.start, end: event.end, category: 'praca', description: 'opis',
      location: 'Biuro', is_all_day: false, reminder_minutes: 15, recurrence: undefined,
    });
  });

  it('returns null for an event without times, which cannot be restored', () => {
    expect(rowToEventPayload({ ...row, start_time: null } as unknown as CalRow)).toBeNull();
  });
});
