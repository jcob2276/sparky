import { describe, expect, it } from 'vitest';
import {
  deriveHealthspanToday,
  mergeOuraHealthspanRows,
  projectHealthspanEvidence,
} from './healthspanProjection';

const context = {
  asOfDate: '2026-07-29',
  chronologicalAge: 38,
  sex: 'M' as const,
};

describe('projectHealthspanEvidence', () => {
  it('prefers a fresh Garmin VO2 estimate and preserves provenance', () => {
    const result = projectHealthspanEvidence({
      ...context,
      oura: [
        { date: '2026-07-27', vo2_max: 48, rhr_avg: 54, total_sleep_hours: 7.4, steps: 8_000 },
      ],
      activities: [
        {
          start_date: '2026-07-28T08:00:00Z',
          gc_vo2max: 53,
          gc_hr_zones: [
            { zone: 1, secsInZone: 2400 },
            { zone: 2, secsInZone: 3600 },
            { zone: 4, secsInZone: 1200 },
          ],
          moving_time: 7200,
          sport_type: 'Run',
        },
      ],
      strengthSessions: [],
      body: [],
    });

    expect(result.vo2Max).toMatchObject({
      value: 53,
      source: 'garmin',
      measuredAt: '2026-07-28',
      quality: 'device_estimate',
    });
    expect(result.moderateVigorousMinutesWeekly?.value).toBe(80);
  });

  it('falls back to Oura VO2 when Garmin has no usable estimate', () => {
    const result = projectHealthspanEvidence({
      ...context,
      oura: [
        { date: '2026-07-27', vo2_max: 48, rhr_avg: 54, total_sleep_hours: 7.4, steps: 8_000 },
      ],
      activities: [],
      strengthSessions: [],
      body: [],
    });

    expect(result.vo2Max).toMatchObject({ value: 48, source: 'oura' });
  });

  it('derives sleep regularity, averages and strength days without inventing missing data', () => {
    const result = projectHealthspanEvidence({
      ...context,
      oura: [
        { date: '2026-07-26', bedtime_start: '2026-07-25T22:50:00Z', rhr_avg: 55, total_sleep_hours: 7, steps: 7_000, stress_high_minutes: 80, recovery_high_minutes: 100 },
        { date: '2026-07-27', bedtime_start: '2026-07-26T23:05:00Z', rhr_avg: 53, total_sleep_hours: 8, steps: 9_000, stress_high_minutes: 60, recovery_high_minutes: 120 },
        { date: '2026-07-28', bedtime_start: '2026-07-27T23:00:00Z', rhr_avg: 54, total_sleep_hours: 7.5, steps: 8_000, stress_high_minutes: 70, recovery_high_minutes: 110 },
      ],
      activities: [],
      strengthSessions: [
        { date: '2026-07-25' },
        { date: '2026-07-27' },
      ],
      body: [{ date: '2026-07-20', body_fat: 17 }],
    });

    expect(result.sleepDurationHours?.value).toBe(7.5);
    expect(result.sleepRegularity?.value).toBeGreaterThan(80);
    expect(result.restingHeartRate?.value).toBe(54);
    expect(result.stepsDaily?.value).toBe(8_000);
    expect(result.strengthDaysWeekly?.value).toBe(2);
    expect(result.bodyComposition?.value).toBe(17);
    expect(result.lifestyle).toBeNull();
  });
});

describe('mergeOuraHealthspanRows', () => {
  it('combines summary and enhanced evidence by date without replacing measured values', () => {
    expect(mergeOuraHealthspanRows(
      [{ date: '2026-07-28', rhr_avg: 54, total_sleep_hours: 7.5, steps: 8_000 }],
      [{ date: '2026-07-28', vo2_max: 48, bedtime_start: '2026-07-27T23:00:00Z' }],
    )).toEqual([{
      date: '2026-07-28',
      rhr_avg: 54,
      total_sleep_hours: 7.5,
      steps: 8_000,
      vo2_max: 48,
      bedtime_start: '2026-07-27T23:00:00Z',
    }]);
  });
});

describe('deriveHealthspanToday', () => {
  it('reuses recovery as capacity and explains how sleep supports the profile', () => {
    const result = deriveHealthspanToday({
      recoveryScore: 58,
      dailyStatus: 'yellow',
      mainLimiter: 'sleep',
      sleepDurationScore: 62,
      sleepRegularityScore: 78,
    });

    expect(result).toEqual({
      capacity: { score: 58, state: 'yellow', limiter: 'sleep' },
      sleepSupport: { score: 68, label: 'do poprawy' },
    });
  });
});
