import { describe, expect, it } from 'vitest';
import { buildRecurrenceRule, parseRecurrenceRule, shiftPeriodDates } from './calendarViewHelpers';

describe('calendar recurrence rules', () => {
  it('round-trips a custom weekly rule with an end date', () => {
    const rules = buildRecurrenceRule('custom', ['MO', 'WE', 'FR'], '2026-12-31');
    expect(parseRecurrenceRule(rules)).toEqual({
      recurrence: 'custom',
      customDays: ['MO', 'WE', 'FR'],
      endDate: '2026-12-31',
    });
  });

  it('parses simple recurrence and empty state', () => {
    expect(parseRecurrenceRule(['RRULE:FREQ=MONTHLY'])).toEqual({
      recurrence: 'monthly', customDays: [], endDate: '',
    });
    expect(parseRecurrenceRule(null)).toEqual({
      recurrence: '', customDays: [], endDate: '',
    });
  });

  it('correctly shifts day, 3-day, week, and month periods', () => {
    // Day forward/backward
    expect(shiftPeriodDates('dzien', '2026-09-11', '2026-09-07', 1)).toEqual({
      nextSelectedDay: '2026-09-12',
      nextWeekStart: '2026-09-07',
    });
    expect(shiftPeriodDates('dzien', '2026-09-11', '2026-09-07', -1)).toEqual({
      nextSelectedDay: '2026-09-10',
      nextWeekStart: '2026-09-07',
    });

    // 3-day forward/backward
    expect(shiftPeriodDates('3dni', '2026-09-11', '2026-09-07', 1)).toEqual({
      nextSelectedDay: '2026-09-14',
      nextWeekStart: '2026-09-14',
    });

    // Week forward/backward
    expect(shiftPeriodDates('tydzien', '2026-09-11', '2026-09-07', 1)).toEqual({
      nextSelectedDay: '2026-09-14',
      nextWeekStart: '2026-09-14',
    });
    expect(shiftPeriodDates('tydzien', '2026-09-11', '2026-09-07', -1)).toEqual({
      nextSelectedDay: '2026-08-31',
      nextWeekStart: '2026-08-31',
    });

    // Month forward/backward
    expect(shiftPeriodDates('miesiac', '2026-09-11', '2026-09-07', 1)).toEqual({
      nextSelectedDay: '2026-10-01',
      nextWeekStart: '2026-09-28',
    });
    expect(shiftPeriodDates('miesiac', '2026-09-11', '2026-09-07', -1)).toEqual({
      nextSelectedDay: '2026-08-01',
      nextWeekStart: '2026-07-27',
    });
  });
});
