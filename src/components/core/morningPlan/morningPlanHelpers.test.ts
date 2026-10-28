import { describe, expect, it } from 'vitest';
import { combineDateTimeWarsawISO } from '../../../lib/date';
import { scheduledTimeHm } from './morningPlanHelpers';

describe('scheduledTimeHm', () => {
  it('reads the Warsaw wall-clock time from a timestamptz returned in UTC (summer)', () => {
    expect(scheduledTimeHm('2026-08-15T18:00:00+00:00')).toBe('20:00');
  });

  it('reads the Warsaw wall-clock time from a timestamptz returned in UTC (winter)', () => {
    expect(scheduledTimeHm('2026-01-15T18:00:00+00:00')).toBe('19:00');
  });

  it('round-trips with combineDateTimeWarsawISO so re-saving an unchanged plan keeps the same moment', () => {
    const stored = new Date(combineDateTimeWarsawISO('2026-08-15', '07:00')).toISOString();
    expect(scheduledTimeHm(stored)).toBe('07:00');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(scheduledTimeHm(null)).toBe('');
    expect(scheduledTimeHm(undefined)).toBe('');
    expect(scheduledTimeHm('not a date')).toBe('');
  });
});
