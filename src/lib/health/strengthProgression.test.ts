import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  analyzeLiftProgression,
  summarizeStrengthProgression,
  type LiftConfig,
} from '@vanguard/domain';

describe('strengthProgression', () => {
  it('estimates 1RM using Epley formula with RIR adjustment', () => {
    // 100kg x 5 reps -> 100 * (1 + 5/30) = 116.7 kg
    expect(estimate1RM(100, 5)).toBe(116.7);
    // 100kg x 5 reps with 2 RIR -> effective 7 reps -> 100 * (1 + 7/30) = 123.3 kg
    expect(estimate1RM(100, 5, 2)).toBe(123.3);
    // 1 rep max direct
    expect(estimate1RM(140, 1)).toBe(140);
  });

  it('analyzes lift progression and detects progression vs previous', () => {
    const benchConfig: LiftConfig = {
      key: 'bench_press',
      name: 'Wyciskanie leżąc',
      target1RM: 120,
      history: [
        { date: '2026-09-10', weightKg: 90, reps: 5 }, // 105 kg e1RM
        { date: '2026-09-24', weightKg: 92.5, reps: 5 }, // 107.9 kg e1RM
        { date: '2026-10-08', weightKg: 95, reps: 5 }, // 110.8 kg e1RM
      ],
    };

    const result = analyzeLiftProgression(benchConfig);
    expect(result.current1RM).toBe(110.8);
    expect(result.allTime1RM).toBe(110.8);
    expect(result.progressPercentage).toBe(92);
    expect(result.deltaVsPreviousPct).toBeGreaterThan(0);
    expect(result.status).toBe('progressing');
    expect(result.recommendedNextWeightKg).toBe(97.5);
  });

  it('summarizes Big 3 total and relative strength ratio', () => {
    const lifts: LiftConfig[] = [
      {
        key: 'bench_press',
        name: 'Wyciskanie leżąc',
        target1RM: 110,
        history: [{ date: '2026-10-01', weightKg: 100, reps: 1 }], // 100 kg
      },
      {
        key: 'squat',
        name: 'Przysiad',
        target1RM: 150,
        history: [{ date: '2026-10-02', weightKg: 140, reps: 1 }], // 140 kg
      },
      {
        key: 'deadlift',
        name: 'Martwy ciąg',
        target1RM: 180,
        history: [{ date: '2026-10-03', weightKg: 160, reps: 1 }], // 160 kg
      },
    ];

    // Big 3 total: 100 + 140 + 160 = 400 kg.
    // Body weight: 80 kg -> ratio: 400 / 80 = 5.0
    const summary = summarizeStrengthProgression(lifts, 80);
    expect(summary.bigThreeTotal1RM).toBe(400);
    expect(summary.relativeStrengthRatio).toBe(5.0);
    expect(summary.averageProgressPercentage).toBeGreaterThan(80);
    expect(summary.overallStatus).toBe('advancing');
  });
});
