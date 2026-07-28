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
  readinessScore = 85,
  sleepScore = 85,
): OuraSleepInsightDay => ({
  date,
  bedtime_start: bedtimeStart,
  bedtime_end: bedtimeEnd,
  total_sleep_hours: sleep,
  readiness_contributors: null,
  readiness_score: readinessScore,
  sleep_score: sleepScore,
});

describe('buildOuraSleepInsights', () => {
  it('uses aggregate sleep sessions and only the last 14 calendar days', () => {
    const history = [
      day('2026-07-20', 7.5, '2026-07-19T23:00:00+02:00', '2026-07-20T07:00:00+02:00'),
      day('2026-07-21', 7.5, '2026-07-20T23:00:00+02:00', '2026-07-21T07:00:00+02:00'),
      day('2026-07-22', 7.5, '2026-07-21T23:00:00+02:00', '2026-07-22T07:00:00+02:00'),
      day('2026-07-23', 7.5, '2026-07-22T23:00:00+02:00', '2026-07-23T07:00:00+02:00'),
      day('2026-07-24', 7.5, '2026-07-23T23:00:00+02:00', '2026-07-24T07:00:00+02:00'),
    ];
    const current = {
      ...day('2026-07-25', 8.5, '2026-07-24T23:10:00+02:00', '2026-07-25T07:10:00+02:00'),
      readiness_contributors: { sleep_regularity: 88 },
    };
    const aggregateHistory = [
      ...history,
      { ...current, total_sleep_hours: 9 },
      day('2026-07-10', 2, '2026-07-09T23:00:00+02:00', '2026-07-10T01:00:00+02:00'),
    ];

    const result = buildOuraSleepInsights(current, [...history, current], aggregateHistory);

    expect(result.regularityScore).toBe(88);
    expect(result.personalNeedMinutes).toBe(480);
    expect(result.personalNeedSource).toBe('typical');
    expect(result.sleepBalanceMinutes).toBe(-90);
    expect(result.sleepDebtDays).toBe(6);
    expect(result.totalNeededMinutes).toBe(2880);
    expect(result.totalSleptMinutes).toBe(2790);
    expect(result.sleepLedger.some((entry) => entry.date === '2026-07-10')).toBe(false);
    expect(result.sleepLedger.at(-1)?.deltaMinutes).toBe(60);
    expect(result.circadianOffsetMinutes).toBe(10);
    expect(result.circadianStatus).toBe('Zgodny');
  });

  it('estimates personal need from a robust 90-day sleep distribution', () => {
    const sleepPattern = [6, 6.5, 7, 7.1, 7.2, 7.3, 7.4, 7.5, 8, 9];
    const aggregateHistory = Array.from({ length: 40 }, (_, index) => day(
      `2026-${String(6 + Math.floor(index / 28)).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
      sleepPattern[index % sleepPattern.length],
      '2026-06-01T23:00:00+02:00',
      '2026-06-02T07:00:00+02:00',
    ));
    const current = aggregateHistory.at(-1)!;

    const result = buildOuraSleepInsights(current, aggregateHistory, aggregateHistory);

    expect(result.personalNeedMinutes).toBe(456);
    expect(result.personalNeedSource).toBe('personal');
  });

  it('does not turn missing measurements into zeroes', () => {
    const result = buildOuraSleepInsights(null, []);

    expect(result.regularityScore).toBeNull();
    expect(result.sleepDebtMinutes).toBeNull();
    expect(result.circadianOffsetMinutes).toBeNull();
    expect(result.personalNeedSource).toBe('typical');
  });

  it('reports circadian confidence from observed timing consistency', () => {
    const history = Array.from({ length: 14 }, (_, index) => day(
      `2026-07-${String(index + 1).padStart(2, '0')}`,
      8,
      '2026-07-01T23:00:00+02:00',
      '2026-07-02T07:00:00+02:00',
    ));
    const current = history.at(-1)!;

    const result = buildOuraSleepInsights(current, history);

    expect(result.circadianConfidence).toBe('solid');
    expect(result.circadianVariabilityMinutes).toBe(0);
  });
});
