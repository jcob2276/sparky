import { describe, expect, it } from 'vitest';
import {
  deduplicateHealthspanActivities,
  projectGarminActivityEvidence,
  selectBestVo2Evidence,
  type HealthspanActivityRecord,
} from './healthspanGarminProjection';

const activity = (overrides: Partial<HealthspanActivityRecord> = {}): HealthspanActivityRecord => ({
  stravaId: 100,
  garminActivityId: 900,
  startDate: '2026-07-29T08:00:00Z',
  sportType: 'Run',
  movingTimeSeconds: 2_400,
  garminVo2Max: 52,
  garminHrZones: [{ zone: 2, seconds: 1_800 }],
  garminAerobicEffect: 3.2,
  garminAnaerobicEffect: 0.4,
  source: 'strava+garmin',
  ...overrides,
});

describe('healthspan Garmin projection', () => {
  it('deduplicates records carrying the same Garmin activity id', () => {
    const result = deduplicateHealthspanActivities([
      activity(),
      activity({ stravaId: 101, source: 'garmin', garminVo2Max: 53 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].garminVo2Max).toBe(53);
  });

  it('falls back to time, type and duration when an external id is unavailable', () => {
    const result = deduplicateHealthspanActivities([
      activity({ garminActivityId: null }),
      activity({
        stravaId: 101,
        garminActivityId: null,
        startDate: '2026-07-29T08:02:00Z',
        movingTimeSeconds: 2_430,
      }),
    ]);

    expect(result).toHaveLength(1);
  });

  it('projects Garmin zones and training effect with provenance', () => {
    const result = projectGarminActivityEvidence(activity());

    expect(result).toMatchObject({
      source: 'garmin',
      sourceRecordIds: ['garmin:900', 'strava:100'],
      activeZoneMinutes: 30,
      aerobicEffect: 3.2,
    });
  });

  it('prefers fresh Garmin VO2 over an older Oura estimate', () => {
    const result = selectBestVo2Evidence({
      garmin: [{ value: 52, measuredAt: '2026-07-29', sourceRecordIds: ['garmin:900'] }],
      oura: { value: 49, measuredAt: '2026-07-20', sourceRecordIds: ['oura:2026-07-20'] },
    });

    expect(result).toMatchObject({ value: 52, source: 'garmin', measuredAt: '2026-07-29' });
  });
});
