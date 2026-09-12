import { describe, expect, it } from 'vitest';
import { buildEditEventPayload, buildEventTimes, buildQuickEventPayload } from './eventPayload';

const OFFSET = /^[+-]\d{2}:\d{2}$/;

describe('buildEventTimes', () => {
  it('builds a timed event on the same day', () => {
    const { start, end } = buildEventTimes({ date: '2026-07-19', startMin: 10 * 60, durationMin: 90, allDay: false });
    expect(start).toMatch(/^2026-07-19T10:00:00/);
    expect(start.slice(-6)).toMatch(OFFSET);
    expect(end).toMatch(/^2026-07-19T11:30:00/);
  });

  it('rolls the end into the next day for overnight durations', () => {
    const { start, end } = buildEventTimes({ date: '2026-07-19', startMin: 23 * 60, durationMin: 120, allDay: false });
    expect(start).toMatch(/^2026-07-19T23:00:00/);
    expect(end).toMatch(/^2026-07-20T01:00:00/);
  });

  it('builds an all-day event as [00:00, next-day 00:00)', () => {
    const { start, end } = buildEventTimes({ date: '2026-07-19', startMin: 12 * 60, durationMin: 60, allDay: true });
    expect(start).toMatch(/^2026-07-19T00:00:00/);
    expect(end).toMatch(/^2026-07-20T00:00:00/);
  });
});

describe('buildQuickEventPayload', () => {
  const base = {
    title: 'Trening',
    date: '2026-07-19',
    startMin: 18 * 60,
    durationMin: 60,
    category: null,
    description: '',
    recurrence: null,
  };

  it('includes location, all-day flag and reminder — the previously dropped fields', () => {
    const payload = buildQuickEventPayload({
      ...base,
      allDay: false,
      location: ' Siłownia ',
      reminderMinutes: 30,
    });
    expect(payload).toMatchObject({
      summary: 'Trening',
      location: 'Siłownia',
      is_all_day: false,
      reminder_minutes: 30,
      recurrence: null,
    });
    expect(payload.start < payload.end).toBe(true);
  });

  it('marks all-day events and ignores the time inputs', () => {
    const payload = buildQuickEventPayload({ ...base, allDay: true, location: '', reminderMinutes: null });
    expect(payload.is_all_day).toBe(true);
    expect(payload.location).toBeUndefined();
    expect(payload.reminder_minutes).toBeNull();
    expect(payload.start).toMatch(/^2026-07-19T00:00:00/);
    expect(payload.end).toMatch(/^2026-07-20T00:00:00/);
  });
});

describe('buildEditEventPayload', () => {
  const base = {
    id: 'evt-1',
    title: ' Lekarz ',
    date: '2026-07-19',
    category: 'zdrowie',
    description: 'kontrola',
    recurrence: null,
  };

  it('rolls the end to the next day when end time is before start time', () => {
    const payload = buildEditEventPayload({ ...base, start: '23:00', end: '01:00', allDay: false, location: '', reminderMinutes: null });
    expect(payload.summary).toBe('Lekarz');
    expect(payload.start).toMatch(/^2026-07-19T23:00:00/);
    expect(payload.end).toMatch(/^2026-07-20T01:00:00/);
  });

  it('carries location and reminder through edits', () => {
    const payload = buildEditEventPayload({ ...base, start: '10:00', end: '11:00', allDay: false, location: 'Przychodnia', reminderMinutes: 1440 });
    expect(payload).toMatchObject({ id: 'evt-1', location: 'Przychodnia', reminder_minutes: 1440, is_all_day: false });
  });

  it('builds an all-day edit without requiring time inputs', () => {
    const payload = buildEditEventPayload({ ...base, start: '', end: '', allDay: true, location: '', reminderMinutes: null });
    expect(payload.is_all_day).toBe(true);
    expect(payload.start).toMatch(/^2026-07-19T00:00:00/);
    expect(payload.end).toMatch(/^2026-07-20T00:00:00/);
  });
});
