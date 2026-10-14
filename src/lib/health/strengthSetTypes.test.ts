import { describe, expect, it } from 'vitest';
import { analyzeStrengthSets, StrengthSetInput } from '@vanguard/domain';

describe('analyzeStrengthSets', () => {
  it('returns zeroes when sets array is empty', () => {
    const summary = analyzeStrengthSets([]);
    expect(summary.totalSets).toBe(0);
    expect(summary.workingSets).toBe(0);
    expect(summary.workingTonnageKg).toBe(0);
  });

  it('separates warmup sets from working sets and tonnage', () => {
    const sets: StrengthSetInput[] = [
      { id: '1', exerciseId: 'squat', setNumber: 1, weightKg: 60, reps: 10, setType: 'warmup' }, // 600kg warmup
      { id: '2', exerciseId: 'squat', setNumber: 2, weightKg: 100, reps: 5, setType: 'normal' }, // 500kg
      { id: '3', exerciseId: 'squat', setNumber: 3, weightKg: 100, reps: 5, setType: 'normal' }, // 500kg
      { id: '4', exerciseId: 'squat', setNumber: 4, weightKg: 80, reps: 8, setType: 'dropset' }, // 640kg
    ];

    const summary = analyzeStrengthSets(sets);
    expect(summary.totalSets).toBe(4);
    expect(summary.warmupSets).toBe(1);
    expect(summary.workingSets).toBe(3);
    expect(summary.totalTonnageKg).toBe(2240); // 600 + 500 + 500 + 640
    expect(summary.workingTonnageKg).toBe(1640); // 500 + 500 + 640
    expect(summary.dropsets).toBe(1);
  });

  it('tracks failure sets and superset groupings', () => {
    const sets: StrengthSetInput[] = [
      { id: '1', exerciseId: 'bench', setNumber: 1, weightKg: 90, reps: 8, setType: 'failure', supersetId: 'SS1' },
      { id: '2', exerciseId: 'row', setNumber: 1, weightKg: 80, reps: 10, setType: 'normal', supersetId: 'SS1' },
      { id: '3', exerciseId: 'curl', setNumber: 1, weightKg: 30, reps: 12, setType: 'failure', supersetId: 'SS2' },
    ];

    const summary = analyzeStrengthSets(sets);
    expect(summary.failureSets).toBe(2);
    expect(summary.supersetGroupsCount).toBe(2);
    expect(summary.fatigueIndex).toBeGreaterThan(3);
  });
});
