import { describe, it, expect } from 'vitest';
import { calculateSleepBank, type SleepBankDayInput } from '@vanguard/domain';

describe('sleepBank', () => {
  it('handles empty history gracefully', () => {
    const result = calculateSleepBank([]);
    expect(result.totalDebtMinutes).toBe(0);
    expect(result.status).toBe('well_rested');
    expect(result.statusLabel).toBe('Brak długu');
  });

  it('calculates sleep debt and recommended payback trajectory', () => {
    // 5 days with 1 hour deficit per day (need 480, actual 420)
    const history: SleepBankDayInput[] = [
      { date: '2026-10-10', sleepDurationMinutes: 420, sleepNeedMinutes: 480 },
      { date: '2026-10-11', sleepDurationMinutes: 420, sleepNeedMinutes: 480 },
      { date: '2026-10-12', sleepDurationMinutes: 420, sleepNeedMinutes: 480 },
      { date: '2026-10-13', sleepDurationMinutes: 420, sleepNeedMinutes: 480 },
      { date: '2026-10-14', sleepDurationMinutes: 420, sleepNeedMinutes: 480 },
    ];

    const result = calculateSleepBank(history, 14, 5, 45);
    // Total debt: -300 minutes (-5.0 hours)
    expect(result.totalDebtMinutes).toBe(-300);
    expect(result.totalDebtHours).toBe(-5);
    expect(result.status).toBe('moderate_debt');
    // Payback: -300 / 5 days = 60 min, capped at maxNightlyExtension 45 min
    expect(result.recommendedNightlyExtensionMinutes).toBe(45);
    // Estimated days: ceil(300 / 45) = 7 days
    expect(result.estimatedDaysToFullPayback).toBe(7);
    expect(result.recommendation).toContain('Umiarkowany dług snu');
  });

  it('credits power naps toward sleep debt', () => {
    const history: SleepBankDayInput[] = [
      // 450 min sleep + 30 min nap = 480 min (matching need 480)
      { date: '2026-10-14', sleepDurationMinutes: 450, sleepNeedMinutes: 480, napMinutes: 30 },
    ];

    const result = calculateSleepBank(history);
    expect(result.totalDebtMinutes).toBe(0);
    expect(result.status).toBe('well_rested');
  });

  it('reports positive balance when actual exceeds sleep need', () => {
    const history: SleepBankDayInput[] = [
      { date: '2026-10-14', sleepDurationMinutes: 540, sleepNeedMinutes: 460 },
    ];

    const result = calculateSleepBank(history);
    expect(result.totalDebtMinutes).toBe(80);
    expect(result.status).toBe('well_rested');
    expect(result.statusLabel).toBe('Nadwyżka snu');
    expect(result.recommendation).toContain('Dodatni bilans');
  });
});
