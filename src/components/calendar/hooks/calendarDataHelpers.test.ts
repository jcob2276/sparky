import { describe, expect, it } from 'vitest';
import { computeVisibleRange, formatTimeOfISO } from './calendarDataHelpers';
import { isSleepSummary } from '../calendarHelpers';

describe('isSleepSummary', () => {
  it('recognises sleep entries, also with a leading emoji', () => {
    expect(isSleepSummary('Sen')).toBe(true);
    expect(isSleepSummary('😴 Sen')).toBe(true);
    expect(isSleepSummary('Sleep 7h')).toBe(true);
  });

  it('does not treat words that merely contain "sen" as sleep', () => {
    expect(isSleepSummary('Sensor lab')).toBe(false);
    expect(isSleepSummary('Konsensus')).toBe(false);
    expect(isSleepSummary(null)).toBe(false);
  });
});

describe('computeVisibleRange', () => {
  it('is stable for every day of the month so navigation does not refetch', () => {
    const first = computeVisibleRange('dzien', '2026-10-19', '2026-10-01');
    const last = computeVisibleRange('dzien', '2026-10-26', '2026-10-31');
    expect(last).toEqual(first);
    expect(first).toEqual({ rangeStart: '2026-09-24', rangeEnd: '2026-11-08' });
  });

  it('covers a week that spills into the next month', () => {
    const range = computeVisibleRange('tydzien', '2026-10-26', '2026-10-26');
    expect(range.rangeEnd >= '2026-11-02').toBe(true);
  });

  it('rolls over the year', () => {
    expect(computeVisibleRange('miesiac', '2026-12-28', '2026-12-31')).toEqual({
      rangeStart: '2026-11-24',
      rangeEnd: '2027-01-08',
    });
  });
});

describe('formatTimeOfISO', () => {
  it('shows Warsaw time for UTC timestamps', () => {
    expect(formatTimeOfISO('2026-10-21T04:00:00+00:00')).toBe('06:00');
    expect(formatTimeOfISO('2026-01-21T05:00:00Z')).toBe('06:00');
  });

  it('falls back for unreadable input', () => {
    expect(formatTimeOfISO('not a date')).toBe('12:00');
  });
});
