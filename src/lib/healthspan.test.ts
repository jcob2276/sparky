import { describe, expect, it } from 'vitest';
import {
  computeFunctionalAge,
  scoreHealthspanContributors,
  type HealthspanInput,
} from '@vanguard/domain';

const input = (overrides: Partial<HealthspanInput> = {}): HealthspanInput => ({
  asOfDate: '2026-07-29',
  chronologicalAge: 38,
  sex: 'M',
  vo2Max: {
    value: 52,
    source: 'garmin',
    measuredAt: '2026-07-26',
    sampleCount: 4,
    quality: 'device_estimate',
  },
  restingHeartRate: {
    value: 51,
    source: 'oura',
    measuredAt: '2026-07-29',
    sampleCount: 28,
    quality: 'measured',
  },
  sleepDurationHours: {
    value: 7.6,
    source: 'oura',
    measuredAt: '2026-07-29',
    sampleCount: 28,
    quality: 'measured',
  },
  sleepRegularity: {
    value: 86,
    source: 'oura',
    measuredAt: '2026-07-29',
    sampleCount: 28,
    quality: 'derived',
  },
  stepsDaily: {
    value: 8_200,
    source: 'oura',
    measuredAt: '2026-07-29',
    sampleCount: 28,
    quality: 'measured',
  },
  moderateVigorousMinutesWeekly: {
    value: 210,
    source: 'garmin',
    measuredAt: '2026-07-28',
    sampleCount: 8,
    quality: 'derived',
  },
  strengthDaysWeekly: {
    value: 2,
    source: 'sparky',
    measuredAt: '2026-07-27',
    sampleCount: 8,
    quality: 'logged',
  },
  bodyComposition: {
    value: 17,
    source: 'sparky',
    measuredAt: '2026-07-20',
    sampleCount: 3,
    quality: 'device_estimate',
  },
  stressRecoveryBalance: {
    value: 72,
    source: 'oura',
    measuredAt: '2026-07-29',
    sampleCount: 14,
    quality: 'derived',
  },
  lifestyle: null,
  ...overrides,
});

describe('scoreHealthspanContributors', () => {
  it('keeps social connection as a visible independent contributor', () => {
    const contributors = scoreHealthspanContributors(input({
      socialConnection: {
        value: 82,
        source: 'manual',
        measuredAt: '2026-07-29',
        sampleCount: 3,
        quality: 'logged',
      },
    }));
    expect(contributors.find((item) => item.key === 'social_connection')).toMatchObject({
      label: 'Relacje i połączenie społeczne',
      value: 82,
    });
  });

  it('scores available contributors with evidence and leaves missing domains absent', () => {
    const result = scoreHealthspanContributors(input({ lifestyle: null }));

    expect(result.some((item) => item.key === 'cardio_fitness')).toBe(true);
    expect(result.find((item) => item.key === 'cardio_fitness')).toMatchObject({
      source: 'garmin',
      direction: 'positive',
    });
    expect(result.some((item) => item.key === 'lifestyle')).toBe(false);
    expect(result.every((item) => item.sampleCount > 0)).toBe(true);
  });

  it('drops stale wearable values instead of turning them into a zero score', () => {
    const result = scoreHealthspanContributors(input({
      vo2Max: {
        value: 52,
        source: 'garmin',
        measuredAt: '2025-12-01',
        sampleCount: 4,
        quality: 'device_estimate',
      },
    }));

    expect(result.some((item) => item.key === 'cardio_fitness')).toBe(false);
  });

  it('caps outliers before they can dominate the profile', () => {
    const result = scoreHealthspanContributors(input({
      vo2Max: {
        value: 99,
        source: 'garmin',
        measuredAt: '2026-07-29',
        sampleCount: 1,
        quality: 'device_estimate',
      },
    }));
    const cardio = result.find((item) => item.key === 'cardio_fitness');

    expect(cardio?.score).toBeLessThanOrEqual(100);
    expect(cardio?.ageImpactYears).toBeGreaterThanOrEqual(-5);
  });
});

describe('computeFunctionalAge', () => {
  it('returns a bounded estimate, uncertainty interval and measured confidence', () => {
    const profile = computeFunctionalAge(input());

    expect(profile.estimatedAge).toBeLessThan(38);
    expect(profile.ageRange.low).toBeLessThanOrEqual(profile.estimatedAge);
    expect(profile.ageRange.high).toBeGreaterThanOrEqual(profile.estimatedAge);
    expect(profile.score).toBeGreaterThan(50);
    expect(profile.confidence.coverage).toBeGreaterThan(70);
    expect(profile.modelVersion).toBe('healthspan-v2');
  });

  it('widens uncertainty when coverage is weak', () => {
    const complete = computeFunctionalAge(input());
    const sparse = computeFunctionalAge(input({
      vo2Max: null,
      moderateVigorousMinutesWeekly: null,
      strengthDaysWeekly: null,
      bodyComposition: null,
      stressRecoveryBalance: null,
    }));
    const completeWidth = complete.ageRange.high - complete.ageRange.low;
    const sparseWidth = sparse.ageRange.high - sparse.ageRange.low;

    expect(sparseWidth).toBeGreaterThan(completeWidth);
    expect(sparse.confidence.overall).toBeLessThan(complete.confidence.overall);
  });
});
