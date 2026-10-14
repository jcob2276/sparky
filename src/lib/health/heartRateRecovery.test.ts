import { describe, expect, it } from 'vitest';
import { calculateHeartRateRecovery } from '@vanguard/domain';

describe('calculateHeartRateRecovery', () => {
  it('returns insufficient_data when peak HR or recovery measurements are missing', () => {
    const result = calculateHeartRateRecovery({ peakHeartRate: 0 });
    expect(result.hasValidData).toBe(false);
    expect(result.category).toBe('insufficient_data');
  });

  it('classifies excellent recovery when 60s drop is >= 30 bpm', () => {
    const result = calculateHeartRateRecovery({
      peakHeartRate: 175,
      heartRateAt60s: 140, // 35 bpm drop
      heartRateAt120s: 120, // 55 bpm drop
    });
    expect(result.hasValidData).toBe(true);
    expect(result.hrDrop60s).toBe(35);
    expect(result.hrDrop120s).toBe(55);
    expect(result.category).toBe('excellent');
    expect(result.isAutonomicFatigued).toBe(false);
  });

  it('classifies poor recovery and flags autonomic fatigue when 60s drop is < 12 bpm', () => {
    const result = calculateHeartRateRecovery({
      peakHeartRate: 180,
      heartRateAt60s: 172, // 8 bpm drop
    });
    expect(result.hasValidData).toBe(true);
    expect(result.hrDrop60s).toBe(8);
    expect(result.category).toBe('poor');
    expect(result.isAutonomicFatigued).toBe(true);
    expect(result.recommendation).toContain('przeciążenie układu autonomicznego');
  });

  it('handles 120s recovery when 60s is absent', () => {
    const result = calculateHeartRateRecovery({
      peakHeartRate: 165,
      heartRateAt120s: 125, // 40 bpm drop -> primary drop estimate ~24
    });
    expect(result.hasValidData).toBe(true);
    expect(result.hrDrop60s).toBeNull();
    expect(result.hrDrop120s).toBe(40);
    expect(result.category).toBe('good');
  });
});
