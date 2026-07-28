import { describe, expect, it } from 'vitest';
import {
  buildOuraSleepInsights,
  type OuraSleepInsightDay,
} from './ouraSleepInsights';

const day = (
  date: string,
  sleep: number,
  bedtimeStart: string,
  bedtimeEnd: string,
): OuraSleepInsightDay => ({
  date,
  bedtime_start: bedtimeStart,
  bedtime_end: bedtimeEnd,
  total_sleep_hours: sleep,
  readiness_contributors: null,
});

describe('buildOuraSleepInsights', () => {
  it('uses measured regularity and calculates sleep debt against an explicit eight-hour target', () => {
    const history = [
      day('2026-07-22', 7.5, '2026-07-21T23:00:00+02:00', '2026-07-22T07:00:00+02:00'),
      day('2026-07-23', 8, '2026-07-22T23:00:00+02:00', '2026-07-23T07:00:00+02:00'),
      day('2026-07-24', 7, '2026-07-23T23:00:00+02:00', '2026-07-24T07:00:00+02:00'),
    ];
    const current = {
      ...day('2026-07-25', 7.5, '2026-07-24T23:10:00+02:00', '2026-07-25T07:10:00+02:00'),
      readiness_contributors: { sleep_regularity: 88 },
    };

    const result = buildOuraSleepInsights(current, [...history, current]);

    expect(result.regularityScore).toBe(88);
    expect(result.sleepDebtMinutes).toBe(120);
    expect(result.sleepDebtDays).toBe(4);
    expect(result.circadianOffsetMinutes).toBe(10);
    expect(result.circadianStatus).toBe('Zgodny');
  });

  it('does not turn missing measurements into zeroes', () => {
    const result = buildOuraSleepInsights(null, []);

    expect(result.regularityScore).toBeNull();
    expect(result.sleepDebtMinutes).toBeNull();
    expect(result.circadianOffsetMinutes).toBeNull();
  });
});
