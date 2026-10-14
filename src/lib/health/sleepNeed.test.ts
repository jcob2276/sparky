import { describe, it, expect } from 'vitest';
import { computeSleepNeed, formatMinutesToHoursMinutes } from '@vanguard/domain';

describe('computeSleepNeed', () => {
  it('calculates standard sleep need when strain and debt are baseline', () => {
    const result = computeSleepNeed({
      baselineMinutes: 480, // 8h
      strainScore: 6.0,
      sleepDebtHours: 0,
      napMinutes: 0,
    });

    expect(result.baselineMinutes).toBe(480);
    expect(result.strainExtraMinutes).toBe(0);
    expect(result.debtExtraMinutes).toBe(0);
    expect(result.napCreditMinutes).toBe(0);
    expect(result.targetSleepMinutes).toBe(480);
    expect(result.targetSleepFormatted).toBe('8h');
  });

  it('adds strain and debt adjustments for intense days', () => {
    const result = computeSleepNeed({
      baselineMinutes: 465, // 7h 45m
      strainScore: 16.0,
      sleepDebtHours: 1.2,
      napMinutes: 0,
    });

    expect(result.strainExtraMinutes).toBeGreaterThan(15);
    expect(result.debtExtraMinutes).toBeGreaterThan(15);
    expect(result.targetSleepMinutes).toBeGreaterThan(500);
    expect(result.targetSleepFormatted).toContain('h');
  });

  it('credits afternoon nap toward total sleep need', () => {
    const result = computeSleepNeed({
      baselineMinutes: 480,
      strainScore: 10.0,
      sleepDebtHours: 0.5,
      napMinutes: 40,
    });

    expect(result.napCreditMinutes).toBeGreaterThan(20);
    expect(result.targetSleepMinutes).toBeLessThan(480 + result.strainExtraMinutes + result.debtExtraMinutes);
  });

  it('formats hours and minutes cleanly', () => {
    expect(formatMinutesToHoursMinutes(480)).toBe('8h');
    expect(formatMinutesToHoursMinutes(495)).toBe('8h 15m');
    expect(formatMinutesToHoursMinutes(510)).toBe('8h 30m');
  });
});
