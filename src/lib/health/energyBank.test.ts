import { describe, it, expect } from 'vitest';
import { computeEnergyBank } from '@vanguard/domain';

describe('computeEnergyBank', () => {
  it('computes morning baseline and drains energy based on strain and stress', () => {
    const result = computeEnergyBank({
      recoveryScore: 85,
      sleepScore: 90,
      strainScore: 12.0,
      stressScore: 35,
      stressHighMinutes: 60,
      recoveryHighMinutes: 30,
    });

    // Baseline: 0.6 * 85 + 0.4 * 90 = 51 + 36 = 87
    expect(result.baselineEnergy).toBe(87);
    expect(result.strainDrain).toBeGreaterThan(0);
    expect(result.stressDrain).toBeGreaterThan(0);
    expect(result.energyBank).toBeLessThan(result.baselineEnergy);
    expect(result.energyBank).toBeGreaterThan(30);
    expect(result.stress.category).toBe('med');
  });

  it('handles low recovery and high strain with low remaining energy', () => {
    const result = computeEnergyBank({
      recoveryScore: 30,
      sleepScore: 40,
      strainScore: 18.0,
      stressScore: 75,
      stressHighMinutes: 180,
    });

    expect(result.baselineEnergy).toBe(34);
    expect(result.energyBank).toBeLessThanOrEqual(25);
    expect(result.stress.category).toBe('high');
    expect(result.explanation).toContain('niska');
  });

  it('handles missing data gracefully with robust fallback defaults', () => {
    const result = computeEnergyBank({
      recoveryScore: null,
      sleepScore: null,
      strainScore: null,
    });

    expect(result.baselineEnergy).toBe(70);
    expect(result.energyBank).toBeGreaterThanOrEqual(5);
    expect(result.energyBank).toBeLessThanOrEqual(100);
    expect(result.stress.current).toBe(35);
  });
});
