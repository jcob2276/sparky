import { describe, expect, it } from 'vitest';
import { computeHealthspanTrend, type HealthspanTrendSnapshot } from '../../packages/domain/src/healthspanTrend';

const domains = ['sleep_duration', 'cardio_fitness', 'strength'] as const;

function weeklySnapshots(scores: number[], modelVersion = 'healthspan-v2'): HealthspanTrendSnapshot[] {
  return scores.map((score, index) => ({
    date: new Date(Date.UTC(2026, 0, 5 + index * 7)).toISOString().slice(0, 10),
    modelVersion,
    coverage: 82,
    evidenceStrength: 85,
    contributors: Object.fromEntries(domains.map((domain) => [domain, score])),
  }));
}

describe('computeHealthspanTrend', () => {
  it('calibrates instead of inventing a neutral multiplier without enough history', () => {
    const result = computeHealthspanTrend(weeklySnapshots([62, 64, 63, 65]), []);

    expect(result.status).toBe('calibrating');
    expect(result.multiplier).toBeNull();
    expect(result.reasons).toContain('insufficient_history');
  });

  it('detects an improving robust trend from comparable domains', () => {
    const result = computeHealthspanTrend(
      weeklySnapshots([55, 56, 56, 57, 58, 58, 59, 60, 63, 65, 67, 69]),
      [],
    );

    expect(result.status).toBe('ready');
    expect(result.direction).toBe('improving');
    expect(result.deltaPer28Days).toBeGreaterThan(0);
    expect(result.commonDomains).toEqual([...domains]);
    expect(result.sampleCount).toBe(12);
  });

  it('does not compare snapshots across model versions', () => {
    const snapshots = [
      ...weeklySnapshots([55, 56, 57, 58, 59, 60], 'healthspan-v1'),
      ...weeklySnapshots([70, 71, 72, 73, 74, 75], 'healthspan-v2').map((item, index) => ({
        ...item,
        date: new Date(Date.UTC(2026, 2, 2 + index * 7)).toISOString().slice(0, 10),
      })),
    ];

    const result = computeHealthspanTrend(snapshots, []);

    expect(result.status).toBe('calibrating');
    expect(result.reasons).toContain('insufficient_same_version_history');
  });

  it('reduces confidence when a confounder is present', () => {
    const snapshots = weeklySnapshots([55, 56, 56, 57, 58, 58, 59, 60, 63, 65, 67, 69]);
    const clean = computeHealthspanTrend(snapshots, []);
    const illness = computeHealthspanTrend(snapshots, ['illness']);

    expect(illness.confidence).toBeLessThan(clean.confidence);
    expect(illness.confounders).toContain('illness');
  });
});
