import { describe, expect, it } from 'vitest';
import { calculateBiologicalAge } from '@vanguard/domain';

describe('calculateBiologicalAge', () => {
  it('returns youthful profile when VO2max, RHR and HRV are athletic and sleep debt is 0', () => {
    const result = calculateBiologicalAge({
      chronologicalAge: 35,
      biologicalSex: 'male',
      vo2Max: 54, // well above age-35 norm (~46)
      restingHeartRate: 48, // athletic
      hrvBaselineMs: 75, // high
      sleepDebtMinutes: 0,
    });

    expect(result.chronologicalAge).toBe(35);
    expect(result.biologicalAge).toBeLessThan(35);
    expect(result.ageDelta).toBeLessThan(-3);
    expect(result.status).toBe('youthful');
    expect(result.factors.length).toBe(4);
    expect(result.factors.every(f => f.status === 'positive')).toBe(true);
  });

  it('identifies elevated biological age when biometrics are suboptimal', () => {
    const result = calculateBiologicalAge({
      chronologicalAge: 40,
      biologicalSex: 'male',
      vo2Max: 32, // below norm
      restingHeartRate: 78, // elevated
      hrvBaselineMs: 20, // low
      sleepDebtMinutes: 450, // 7.5h debt
    });

    expect(result.biologicalAge).toBeGreaterThan(40);
    expect(result.ageDelta).toBeGreaterThan(3);
    expect(result.status).toBe('accelerated');
    expect(result.factors.every(f => f.status === 'negative')).toBe(true);
  });

  it('handles partial inputs gracefully without crashing', () => {
    const result = calculateBiologicalAge({
      chronologicalAge: 28,
    });
    expect(result.chronologicalAge).toBe(28);
    expect(result.biologicalAge).toBe(28);
    expect(result.ageDelta).toBe(0);
    expect(result.factors.length).toBe(0);
  });

  it('rewards or treats surplus sleep (negative debt) as zero debt', () => {
    const result = calculateBiologicalAge({
      chronologicalAge: 30,
      sleepDebtMinutes: -120, // 2h surplus
    });
    const sleepFactor = result.factors.find(f => f.factor.includes('sn'));
    expect(sleepFactor?.status).toBe('positive');
    expect(sleepFactor?.yearsDelta).toBe(-0.8);
  });
});
