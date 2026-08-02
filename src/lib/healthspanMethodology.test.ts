import { describe, expect, it } from 'vitest';
import {
  HEALTHSPAN_METHODOLOGY,
  HEALTHSPAN_MODEL_VERSION,
  scoreContributorValue,
} from '../../packages/domain/src/healthspanMethodology';
import type { HealthspanContributorKey } from '@vanguard/domain';

const expectedKeys: HealthspanContributorKey[] = [
  'cardio_fitness',
  'resting_heart_rate',
  'sleep_duration',
  'sleep_regularity',
  'daily_movement',
  'aerobic_activity',
  'strength',
  'body_composition',
  'stress_recovery',
  'lifestyle',
  'social_connection',
];

describe('HEALTHSPAN_METHODOLOGY', () => {
  it('versions every contributor with auditable evidence metadata', () => {
    expect(HEALTHSPAN_MODEL_VERSION).toBe('healthspan-v2');
    expect(Object.keys(HEALTHSPAN_METHODOLOGY).sort()).toEqual([...expectedKeys].sort());

    for (const methodology of Object.values(HEALTHSPAN_METHODOLOGY)) {
      expect(methodology.sourceUrl).toMatch(/^https:\/\//);
      expect(methodology.evidenceClass).toMatch(/guideline|cohort|consensus|observational/);
      expect(methodology.minimumSamples).toBeGreaterThan(0);
      expect(methodology.staleAfterDays).toBeGreaterThan(0);
      expect(methodology.weight).toBeGreaterThan(0);
      expect(methodology.maxAgeImpactYears).toBeGreaterThan(0);
    }
  });

  it('uses WHO thresholds for aerobic activity and strength', () => {
    expect(scoreContributorValue('aerobic_activity', 150, { age: 38, sex: 'M' })).toBeGreaterThanOrEqual(80);
    expect(scoreContributorValue('aerobic_activity', 300, { age: 38, sex: 'M' })).toBe(100);
    expect(scoreContributorValue('strength', 2, { age: 38, sex: 'M' })).toBe(100);
  });

  it('does not penalise healthy adults merely for sleeping longer than eight hours', () => {
    expect(scoreContributorValue('sleep_duration', 7, { age: 38, sex: 'M' })).toBeGreaterThanOrEqual(80);
    expect(scoreContributorValue('sleep_duration', 9.5, { age: 38, sex: 'M' })).toBeGreaterThanOrEqual(80);
  });

  it('interprets VO2 max against age and sex', () => {
    const male = scoreContributorValue('cardio_fitness', 45, { age: 40, sex: 'M' });
    const female = scoreContributorValue('cardio_fitness', 45, { age: 40, sex: 'F' });
    const olderMale = scoreContributorValue('cardio_fitness', 45, { age: 65, sex: 'M' });

    expect(female).toBeGreaterThan(male);
    expect(olderMale).toBeGreaterThan(male);
  });
});
