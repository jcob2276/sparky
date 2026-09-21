import { describe, it, expect } from 'vitest';
import {
  calculatePlates,
  resolveBarWeight,
  formatPlateBreakdownSummary,
} from './workoutPlateCalculator';

describe('workoutPlateCalculator', () => {
  it('returns empty plates if weight is less than or equal to bar', () => {
    const res = calculatePlates(20, 20);
    expect(res.weightPerSide).toBe(0);
    expect(res.plates).toEqual([]);
    expect(res.remainder).toBe(0);
    expect(formatPlateBreakdownSummary(res)).toBe('Sam gryf (20 kg)');
  });

  it('calculates plates correctly for 100 kg on 20 kg bar (40 kg per side: 25 + 15)', () => {
    const res = calculatePlates(100, 20);
    expect(res.weightPerSide).toBe(40);
    expect(res.plates).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(res.remainder).toBe(0);
    expect(formatPlateBreakdownSummary(res)).toBe('Gryf 20 kg · 40 kg na stronę: [ 25 kg + 15 kg ]');
  });

  it('calculates plates correctly for 82.5 kg on 20 kg bar (31.25 kg per side: 25 + 5 + 1.25)', () => {
    const res = calculatePlates(82.5, 20);
    expect(res.weightPerSide).toBe(31.25);
    expect(res.plates).toEqual([
      { plate: 25, count: 1 },
      { plate: 5, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
    expect(res.remainder).toBe(0);
  });

  it('supports bar presets by ID: ez (10kg), smith (9kg), smith_counterbalanced (0kg), trap (25kg)', () => {
    expect(resolveBarWeight('ez')).toBe(10);
    expect(resolveBarWeight('smith')).toBe(9);
    expect(resolveBarWeight('smith_counterbalanced')).toBe(0);
    expect(resolveBarWeight('trap')).toBe(25);

    // 50kg on EZ bar (10kg) -> 20kg per side (20kg plate)
    const ezRes = calculatePlates(50, 'ez');
    expect(ezRes.weightPerSide).toBe(20);
    expect(ezRes.plates).toEqual([{ plate: 20, count: 1 }]);

    // 80kg on counterbalanced Smith (0kg) -> 40kg per side (25 + 15)
    const smithCbRes = calculatePlates(80, 'smith_counterbalanced');
    expect(smithCbRes.weightPerSide).toBe(40);
    expect(smithCbRes.plates).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
  });
});
