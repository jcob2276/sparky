import { describe, expect, it } from 'vitest';
import { matchesSmartQuery, nextOccurrenceDate, type SmartQueryItem } from './todoUtils';

const item: SmartQueryItem = {
  id: '1', title: 'Raport', priority: 'high', tags: ['praca'], due_date: '2026-07-18',
  section_id: null, status: 'open', duration_minutes: 90,
  scheduled_time: '2026-07-18T10:00:00+02:00', reminder_at: null,
};

describe('matchesSmartQuery', () => {
  it('supports saved views for duration, scheduling and reminders', () => {
    expect(matchesSmartQuery('duration:deep scheduled:yes reminder:no', item, '2026-07-18', {})).toBe(true);
    expect(matchesSmartQuery('duration:short', item, '2026-07-18', {})).toBe(false);
    expect(matchesSmartQuery('reminder:yes', item, '2026-07-18', {})).toBe(false);
  });
});

describe('nextOccurrenceDate', () => {
  it('advances daily tasks by 1 day', () => {
    expect(nextOccurrenceDate('2026-10-15', 'daily', '2026-10-15')).toBe('2026-10-16');
  });

  it('advances weekly tasks by 7 days', () => {
    expect(nextOccurrenceDate('2026-10-15', 'weekly', '2026-10-15')).toBe('2026-10-22');
  });

  it('advances biweekly tasks by 14 days', () => {
    expect(nextOccurrenceDate('2026-10-15', 'biweekly', '2026-10-15')).toBe('2026-10-29');
  });

  it('advances weekdays tasks: Friday to Monday, Thursday to Friday', () => {
    // 2026-10-16 is Friday
    expect(nextOccurrenceDate('2026-10-16', 'weekdays', '2026-10-16')).toBe('2026-10-19');
    // 2026-10-15 is Thursday
    expect(nextOccurrenceDate('2026-10-15', 'weekdays', '2026-10-15')).toBe('2026-10-16');
  });

  it('advances monthly tasks by 1 month', () => {
    expect(nextOccurrenceDate('2026-10-15', 'monthly', '2026-10-15')).toBe('2026-11-15');
  });

  it('anchors overdue recurring tasks to today so next date is not in the past', () => {
    // Overdue daily task from 2026-10-01 marked done on 2026-10-15
    expect(nextOccurrenceDate('2026-10-01', 'daily', '2026-10-15')).toBe('2026-10-16');
  });
});
