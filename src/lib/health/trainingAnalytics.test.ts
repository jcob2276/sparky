import { describe, expect, it } from 'vitest';
import {
  rirAdjustedE1rm,
  rirEffectiveness,
  effectiveVolume,
  isHardSet,
  computeAcwr,
  linearTrendSlope,
  intraSessionFatigueIndex,
  sessionRpeRirMismatch,
} from '@vanguard/domain';
import { buildHardSetsWeekly } from './trainingAnalytics';
import { getTodayWarsaw } from '../date';

describe('setMetrics (domain)', () => {
  it('rirEffectiveness decays with higher RIR', () => {
    expect(rirEffectiveness(0)).toBe(1);
    expect(rirEffectiveness(4)).toBe(0.7);
    expect(rirEffectiveness(null)).toBe(1);
  });

  it('rirAdjustedE1rm adds RIR to reps', () => {
    const raw = rirAdjustedE1rm(100, 5, null);
    const adjusted = rirAdjustedE1rm(100, 5, 2);
    expect(adjusted).toBeGreaterThan(raw!);
  });

  it('effectiveVolume scales by RIR', () => {
    expect(effectiveVolume(100, 8, 0)).toBe(800);
    expect(effectiveVolume(100, 8, 4)).toBe(560);
    expect(effectiveVolume(0, 10, 1)).toBe(10);
  });

  it('isHardSet treats missing RIR as hard', () => {
    expect(isHardSet(null)).toBe(true);
    expect(isHardSet(3)).toBe(false);
  });
});

describe('sessionAnalytics (domain)', () => {
  it('computeAcwr matches band thresholds', () => {
    const rows = [
      ...Array.from({ length: 21 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        strain_score: 8,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        date: `2026-01-${String(22 + i).padStart(2, '0')}`,
        strain_score: 16,
      })),
    ];
    const m = computeAcwr(rows);
    expect(m.acwr).toBeGreaterThan(1.3);
    expect(['elevated', 'spike_risk']).toContain(m.band);
  });

  it('linearTrendSlope detects rising series', () => {
    const t = linearTrendSlope([80, 82, 85, 88]);
    expect(t?.label).toBe('rising');
  });

  it('intraSessionFatigueIndex measures rep drop', () => {
    const f = intraSessionFatigueIndex([
      { weight: 80, reps: 10, set_number: 1 },
      { weight: 80, reps: 8, set_number: 2 },
      { weight: 80, reps: 7, set_number: 3 },
    ]);
    expect(f?.repDropPct).toBe(30);
  });

  it('sessionRpeRirMismatch flags large delta', () => {
    const m = sessionRpeRirMismatch(5, [
      { reps: 8, rir: 0 },
      { reps: 8, rir: 0 },
    ]);
    expect(m?.flagged).toBe(true);
  });
});

describe('buildHardSetsWeekly', () => {
  it('aggregates hard sets by muscle tag', () => {
    const buckets = buildHardSetsWeekly([
      {
        date: getTodayWarsaw(),
        exercise_logs: [
          {
            exercise_name: 'Wyciskanie płaskie',
            reps: 8,
            rir: 1,
            muscle_tags: ['klatka', 'triceps'],
          },
          {
            exercise_name: 'Wyciskanie płaskie',
            reps: 8,
            rir: 1,
            muscle_tags: ['klatka', 'triceps'],
          },
        ],
      },
    ], 1);
    expect(buckets[0].total).toBeGreaterThan(0);
    expect(buckets[0].byTag.klatka).toBeGreaterThan(0);
  });
});
