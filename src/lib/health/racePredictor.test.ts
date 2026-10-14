import { describe, expect, it } from 'vitest';
import {
  predictRaceTimes,
  formatRaceTime,
  formatRacePace,
  type RunningActivityInput,
} from '@vanguard/domain';

describe('racePredictor formatting', () => {
  it('formats race times and paces into human readable strings', () => {
    expect(formatRaceTime(2700)).toBe('45:00');
    expect(formatRaceTime(3665)).toBe('1:01:05');
    expect(formatRaceTime(0)).toBe('00:00');
    expect(formatRacePace(270)).toBe('4:30/km');
    expect(formatRacePace(305)).toBe('5:05/km');
  });
});

describe('racePredictor model', () => {
  const asOf = '2026-10-14T12:00:00Z';

  it('returns state insufficient_data when fewer than 3 runs exist', () => {
    const activities: RunningActivityInput[] = [
      {
        id: 'r1',
        startDate: '2026-10-10T08:00:00Z',
        distanceMeters: 5000,
        movingTimeSeconds: 1400, // 23:20 5k
      },
    ];

    const result = predictRaceTimes(activities, { asOfDate: asOf, goal10kSeconds: 2700 });
    expect(result.state).toBe('insufficient_data');
    expect(result.predictions).toHaveLength(0);
    expect(result.applicabilityNote).toContain('potwierdzony start');
  });

  it('ignores activities that are walks or shorter than 3km', () => {
    const activities: RunningActivityInput[] = [
      { id: 'r1', startDate: '2026-10-10T08:00:00Z', distanceMeters: 5000, movingTimeSeconds: 1400, elapsedTimeSeconds: 1400, effort: 'race', sportType: 'Run' },
      { id: 'r2', startDate: '2026-10-08T08:00:00Z', distanceMeters: 2000, movingTimeSeconds: 600, elapsedTimeSeconds: 600, effort: 'race', sportType: 'Run' }, // too short
      { id: 'w1', startDate: '2026-10-06T08:00:00Z', distanceMeters: 6000, movingTimeSeconds: 3600, elapsedTimeSeconds: 3600, effort: 'race', sportType: 'Walk' }, // walk
    ];

    const result = predictRaceTimes(activities, { asOfDate: asOf });
    expect(result.basisRunsCount).toBe(1);
    expect(result.supportingRuns.map(run=>run.id)).toEqual(['r1']);
  });

  it('predicts 5k, 10k, half marathon times and compares against sub 45 min goal', () => {
    const activities: RunningActivityInput[] = [
      { id: 'r1', startDate: '2026-10-12T07:30:00Z', distanceMeters: 5000, movingTimeSeconds: 1380, elapsedTimeSeconds: 1380, effort: 'race', sportType: 'Run' },
      { id: 'r2', startDate: '2026-10-05T07:30:00Z', distanceMeters: 8000, movingTimeSeconds: 2250, elapsedTimeSeconds: 2250, effort: 'race', sportType: 'Run' },
      { id: 'r3', startDate: '2026-09-28T07:30:00Z', distanceMeters: 10000, movingTimeSeconds: 2820, elapsedTimeSeconds: 2820, effort: 'race', sportType: 'Run' },
    ];

    const result = predictRaceTimes(activities, { asOfDate: asOf, goal10kSeconds: 2700 });
    expect(result.state).toBe('ready');
    expect(result.predictions).toHaveLength(3);

    const pred10k = result.predictions.find((p) => p.distanceName === '10k')!;
    expect(pred10k).toBeDefined();
    expect(pred10k.predictedSeconds).toBeGreaterThan(2700);
    expect(pred10k.predictedSeconds).toBeLessThan(3000);
    expect(pred10k.scenarioFastSeconds).toBeLessThanOrEqual(pred10k.predictedSeconds);
    expect(pred10k.scenarioSlowSeconds).toBeGreaterThanOrEqual(pred10k.predictedSeconds);

    expect(result.targetGoal10k).toBeDefined();
    expect(result.targetGoal10k?.achieved).toBe(false);
    expect(result.targetGoal10k?.formattedGap).toContain('Prognoza powyżej celu');
  });

  it('never confirms an actual goal from an extrapolated prediction', () => {
    const activities: RunningActivityInput[] = [
      { id: 'r1', startDate: '2026-10-12T07:30:00Z', distanceMeters: 5000, movingTimeSeconds: 1260, elapsedTimeSeconds: 1260, effort: 'race', sportType: 'Run' },
      { id: 'r2', startDate: '2026-10-05T07:30:00Z', distanceMeters: 8000, movingTimeSeconds: 2040, elapsedTimeSeconds: 2040, effort: 'race', sportType: 'Run' },
      { id: 'r3', startDate: '2026-09-28T07:30:00Z', distanceMeters: 10000, movingTimeSeconds: 2610, elapsedTimeSeconds: 2610, effort: 'race', sportType: 'Run' },
    ];

    const result = predictRaceTimes(activities, { asOfDate: asOf, goal10kSeconds: 2700 });
    expect(result.state).toBe('ready');
    expect(result.targetGoal10k?.achieved).toBe(false);
    expect(result.targetGoal10k?.formattedGap).not.toContain('Cel osiągnięty');
  });
});
