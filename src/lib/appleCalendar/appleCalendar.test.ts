import { describe, it, expect } from 'vitest';
import {
  createDateInterval,
  intervalDuration,
  intervalContains,
  intervalsIntersect,
  intervalIntersection,
  isDateInWeekend,
  dateIntervalOfWeekend,
  dateComponentsDiff,
} from './appleDateInterval';
import {
  parseEKRecurrenceRule,
  formatEKRecurrenceRule,
  expandOccurrences,
} from './appleRecurrenceEngine';
import { computeEventColumns } from './appleEventLayoutEngine';
import { formatAlarmLabel, getUpcomingAlarms } from './appleAlarmEngine';

describe('appleDateInterval Engine', () => {
  it('creates valid DateInterval and checks containment & duration', () => {
    const start = '2026-08-02T10:00:00Z';
    const end = '2026-08-02T12:00:00Z';
    const interval = createDateInterval(start, end);

    expect(intervalDuration(interval)).toBe(2 * 60 * 60 * 1000); // 2 hours
    expect(intervalContains(interval, '2026-08-02T11:00:00Z')).toBe(true);
    expect(intervalContains(interval, '2026-08-02T13:00:00Z')).toBe(false);
  });

  it('correctly calculates interval intersection and overlap', () => {
    const a = createDateInterval('2026-08-02T10:00:00Z', '2026-08-02T14:00:00Z');
    const b = createDateInterval('2026-08-02T12:00:00Z', '2026-08-02T16:00:00Z');
    const c = createDateInterval('2026-08-02T15:00:00Z', '2026-08-02T17:00:00Z');

    expect(intervalsIntersect(a, b)).toBe(true);
    expect(intervalsIntersect(a, c)).toBe(false);

    const overlap = intervalIntersection(a, b);
    expect(overlap).not.toBeNull();
    expect(overlap?.start.toISOString()).toBe(new Date('2026-08-02T12:00:00Z').toISOString());
    expect(overlap?.end.toISOString()).toBe(new Date('2026-08-02T14:00:00Z').toISOString());
  });

  it('identifies weekends correctly', () => {
    expect(isDateInWeekend('2026-08-01')).toBe(true); // Saturday
    expect(isDateInWeekend('2026-08-02')).toBe(true); // Sunday
    expect(isDateInWeekend('2026-08-03')).toBe(false); // Monday

    const weekend = dateIntervalOfWeekend('2026-08-03');
    expect(isDateInWeekend(weekend.start)).toBe(true);
    expect(isDateInWeekend(weekend.end)).toBe(true);
  });

  it('calculates exact date components difference', () => {
    const diff = dateComponentsDiff('2026-08-02T10:00:00Z', '2026-08-03T12:30:00Z');
    expect(diff.days).toBe(1);
    expect(diff.hours).toBe(2);
    expect(diff.minutes).toBe(30);
    expect(diff.totalMinutes).toBe(26 * 60 + 30);
  });
});

describe('appleRecurrenceEngine (EKRecurrenceRule)', () => {
  it('parses and formats custom weekly recurrence rules', () => {
    const ruleStr = 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR';
    const parsed = parseEKRecurrenceRule(ruleStr);

    expect(parsed).not.toBeNull();
    expect(parsed?.frequency).toBe('weekly');
    expect(parsed?.interval).toBe(2);
    expect(parsed?.daysOfWeek).toEqual(['MO', 'WE', 'FR']);

    const formatted = formatEKRecurrenceRule(parsed!);
    expect(formatted).toBe(ruleStr);
  });

  it('expands recurring event occurrences within a target DateInterval', () => {
    const baseEvent = {
      id: 'ev-1',
      event_id: 'ev-1',
      summary: 'Trening siłowy',
      start_time: '2026-08-03T09:00:00Z', // Monday
      end_time: '2026-08-03T10:00:00Z',
      category: 'cialo_trening',
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'],
    };

    const targetInterval = createDateInterval('2026-08-03T00:00:00Z', '2026-08-09T23:59:59Z');
    const occurrences = expandOccurrences(baseEvent, targetInterval);

    expect(occurrences.length).toBe(3); // Mon, Wed, Fri
    expect(occurrences[0].start_time).toContain('2026-08-03');
    expect(occurrences[1].start_time).toContain('2026-08-05');
    expect(occurrences[2].start_time).toContain('2026-08-07');
  });
});

describe('appleEventLayoutEngine (EKEventLayout)', () => {
  it('computes side-by-side columns for overlapping events', () => {
    const events = [
      { id: '1', event_id: '1', summary: 'Spotkanie A', start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T11:30:00Z', category: 'praca' },
      { id: '2', event_id: '2', summary: 'Spotkanie B', start_time: '2026-08-02T10:30:00Z', end_time: '2026-08-02T11:15:00Z', category: 'praca' },
      { id: '3', event_id: '3', summary: 'Obiad C', start_time: '2026-08-02T12:00:00Z', end_time: '2026-08-02T13:00:00Z', category: 'praca' },
    ];

    const positioned = computeEventColumns(events);

    expect(positioned.length).toBe(3);

    const evA = positioned.find((e) => e.id === '1')!;
    const evB = positioned.find((e) => e.id === '2')!;
    const evC = positioned.find((e) => e.id === '3')!;

    expect(evA.totalColumns).toBe(2);
    expect(evB.totalColumns).toBe(2);
    expect(evA.columnIndex).not.toBe(evB.columnIndex);
    expect(evA.widthPercent).toBe(50);
    expect(evB.widthPercent).toBe(50);

    expect(evC.totalColumns).toBe(1);
    expect(evC.widthPercent).toBe(100);
  });
});

describe('appleAlarmEngine (EKAlarm)', () => {
  it('formats alarm offset labels in Polish', () => {
    expect(formatAlarmLabel(0)).toBe('W momencie wydarzenia');
    expect(formatAlarmLabel(15)).toBe('15 minut przed');
    expect(formatAlarmLabel(60)).toBe('1 godzina przed');
    expect(formatAlarmLabel(1440)).toBe('1 dzień przed');
    expect(formatAlarmLabel(-1)).toBe('Brak przypomnienia');
  });

  it('detects upcoming event alarms', () => {
    const now = new Date('2026-08-02T10:00:00Z');
    const events = [
      {
        id: '1',
        event_id: '1',
        summary: 'Ważne spotkanie',
        start_time: '2026-08-02T10:15:00Z',
        end_time: '2026-08-02T11:00:00Z',
        category: 'praca',
        reminder_minutes: 15,
      },
    ];

    const alarms = getUpcomingAlarms(events, now, 30);

    expect(alarms.length).toBe(1);
    expect(alarms[0].eventId).toBe('1');
    expect(alarms[0].alarmTime.toISOString()).toBe(now.toISOString());
  });
});
