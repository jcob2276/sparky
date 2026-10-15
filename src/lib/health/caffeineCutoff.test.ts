import { describe, it, expect } from 'vitest';
import {
  calculateCutoffTime,
  calculateCaffeineCutoff,
  calculateDynamicFueling,
} from '@vanguard/domain';

describe('caffeineCutoff', () => {
  it('calculates cutoff time 10 hours before bedtime correctly', () => {
    expect(calculateCutoffTime('23:00', 10)).toBe('13:00');
    expect(calculateCutoffTime('22:30', 10)).toBe('12:30');
    expect(calculateCutoffTime('00:30', 10)).toBe('14:30');
    expect(calculateCutoffTime('01:00', 10)).toBe('15:00');
  });

  it('determines safe window when current time is well before cutoff', () => {
    // Current time: 09:00, Bedtime: 23:00, Cutoff: 13:00
    const nowIso = '2026-10-14T09:00:00';
    const result = calculateCaffeineCutoff(
      '23:00',
      [{ amountMg: 95, loggedAt: '2026-10-14T08:00:00' }],
      nowIso
    );

    expect(result.cutoffTime).toBe('13:00');
    expect(result.totalConsumedMg).toBe(95);
    expect(result.status).toBe('safe_window');
    expect(result.activeCurrentMg).toBeGreaterThan(0);
    expect(result.activeBedtimeMg).toBeLessThan(25);
  });

  it('flags warning when late caffeine results in high bedtime active level', () => {
    // Bedtime 23:00, Double espresso (126 mg) at 21:00 (2h before bed)
    const nowIso = '2026-10-14T21:30:00';
    const result = calculateCaffeineCutoff(
      '23:00',
      [
        { amountMg: 126, loggedAt: '2026-10-14T21:00:00' },
      ],
      nowIso
    );

    expect(result.status).toBe('bedtime_warning');
    expect(result.activeBedtimeMg).toBeGreaterThanOrEqual(25);
    expect(result.recommendation).toContain('Wysoka kofeina o porze snu');
  });

  it('correctly handles post-midnight bedtime (01:00 AM) when currently at 00:30 AM', () => {
    // Bedtime: 01:00 AM, now: 00:30 AM (30 min before bed)
    // Cutoff was 10h prior (15:00 afternoon) -> must be cutoff_passed, NOT safe_window
    const nowIso = '2026-10-15T00:30:00';
    const result = calculateCaffeineCutoff('01:00', [], nowIso, 10);

    expect(result.cutoffTime).toBe('15:00');
    expect(result.status).toBe('cutoff_passed');
    expect(result.minutesUntilCutoff).toBeLessThan(0);
  });

  it('detects approaching cutoff within 60 minutes', () => {
    // Bedtime: 23:00, Cutoff: 13:00, Now: 12:45
    const nowIso = '2026-10-14T12:45:00';
    const result = calculateCaffeineCutoff('23:00', [], nowIso, 10);

    expect(result.cutoffTime).toBe('13:00');
    expect(result.status).toBe('approaching_cutoff');
    expect(result.minutesUntilCutoff).toBe(15);
  });

  it('calculates dynamic fueling based on base and active burn', () => {
    const fueling = calculateDynamicFueling({
      baseCalories: 2000,
      activeBurnCalories: 500,
      consumedCalories: 2100,
      goal: 'maintain',
    });

    expect(fueling.dynamicTargetCalories).toBe(2500);
    expect(fueling.remainingCalories).toBe(400);
    expect(fueling.balanceCalories).toBe(-400);
    expect(fueling.fuelingPercentage).toBe(84);
  });
});
