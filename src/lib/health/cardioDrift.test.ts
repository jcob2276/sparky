import { describe, it, expect } from 'vitest';
import { calculateCardioDrift } from '@vanguard/domain';

describe('cardioDrift', () => {
  it('calculates optimal coupling when pace and heart rate remain parallel', () => {
    // Pace: 3.33 m/s (5:00 /km) throughout, HR: 140 bpm half1, 142 bpm half2
    const result = calculateCardioDrift({
      half1SpeedMps: 3.33,
      half1AvgHr: 140,
      half2SpeedMps: 3.33,
      half2AvgHr: 142,
    });

    expect(result.decouplingPercentage).toBeLessThan(3.5);
    expect(result.rating).toBe('optimal_coupling');
    expect(result.hasSignificantDrift).toBe(false);
    expect(result.recommendation).toContain('Wzorcowa baza tlenowa');
  });

  it('detects significant aerobic decoupling when heart rate drifts upward', () => {
    // Pace: 3.33 m/s (5:00 /km) throughout, but HR drifts from 140 bpm to 152 bpm (+12 bpm drift!)
    const result = calculateCardioDrift({
      half1SpeedMps: 3.33,
      half1AvgHr: 140,
      half2SpeedMps: 3.33,
      half2AvgHr: 152,
    });

    // Decoupling: (3.33/140 - 3.33/152) / (3.33/140) = 1 - 140/152 ≈ 7.9%
    expect(result.decouplingPercentage).toBeGreaterThan(5.0);
    expect(result.rating).toBe('aerobic_decoupling');
    expect(result.hasSignificantDrift).toBe(true);
    expect(result.hrDeltaBpm).toBe(12);
    expect(result.recommendation).toContain('Zidentyfikowano dryf tętna');
  });
});
