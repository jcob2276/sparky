import { describe, it, expect } from 'vitest';
import { calculatePlates } from './workoutPlateCalculator';

describe('workoutPlateCalculator', () => {
  it('returns empty plates if weight is less than or equal to bar', () => {
    const res = calculatePlates(20, 20);
    expect(res.weightPerSide).toBe(0);
    expect(res.plates).toEqual([]);
    expect(res.remainder).toBe(0);
  });

  it('calculates plates correctly for 100 kg on 20 kg bar (40 kg per side: 25 + 15)', () => {
    const res = calculatePlates(100, 20);
    expect(res.weightPerSide).toBe(40);
    expect(res.plates).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(res.remainder).toBe(0);
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
});
