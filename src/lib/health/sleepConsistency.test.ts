import { describe, it, expect } from 'vitest';
import {
  calculateSleepConsistency,
  timeToBedtimeMinutes,
  bedtimeMinutesToTime,
  timeToWakeMinutes,
  wakeMinutesToTime,
  type DailySleepRecord,
} from '@vanguard/domain';

describe('sleepConsistency', () => {
  it('converts bedtime across midnight smoothly', () => {
    // 23:00 -> 11 hours after noon = 660 mins
    expect(timeToBedtimeMinutes('23:00')).toBe(660);
    // 00:30 -> 12.5 hours after noon = 750 mins
    expect(timeToBedtimeMinutes('00:30')).toBe(750);
    expect(bedtimeMinutesToTime(660)).toBe('23:00');
    expect(bedtimeMinutesToTime(750)).toBe('00:30');
  });

  it('converts wake time smoothly', () => {
    expect(timeToWakeMinutes('07:30')).toBe(450);
    expect(wakeMinutesToTime(450)).toBe('07:30');
  });

  it('evaluates highly consistent sleep schedule as optimal', () => {
    const records: DailySleepRecord[] = [
      { date: '2026-10-05', bedtime: '23:00', wakeTime: '07:00', isFreeDay: false },
      { date: '2026-10-06', bedtime: '23:05', wakeTime: '07:05', isFreeDay: false },
      { date: '2026-10-07', bedtime: '22:55', wakeTime: '06:55', isFreeDay: false },
      { date: '2026-10-08', bedtime: '23:00', wakeTime: '07:00', isFreeDay: false },
      { date: '2026-10-09', bedtime: '23:10', wakeTime: '07:10', isFreeDay: false },
      { date: '2026-10-10', bedtime: '23:15', wakeTime: '07:15', isFreeDay: true },
      { date: '2026-10-11', bedtime: '23:05', wakeTime: '07:05', isFreeDay: true },
    ];

    const result = calculateSleepConsistency(records);
    expect(result.rating).toBe('optimal');
    expect(result.consistencyScore).toBeGreaterThanOrEqual(95);
    expect(result.bedtimeStdDevMinutes).toBeLessThan(15);
    expect(result.wakeStdDevMinutes).toBeLessThan(15);
    expect(result.hasMeaningfulSocialJetlag).toBe(false);
    expect(result.socialJetlagMinutes).toBeLessThan(30);
  });

  it('detects meaningful social jetlag when weekend sleep shifts significantly', () => {
    const records: DailySleepRecord[] = [
      // Workdays: bed 23:00, wake 06:30 -> midsleep 02:45
      { date: '2026-10-05', bedtime: '23:00', wakeTime: '06:30', isFreeDay: false },
      { date: '2026-10-06', bedtime: '23:00', wakeTime: '06:30', isFreeDay: false },
      { date: '2026-10-07', bedtime: '23:00', wakeTime: '06:30', isFreeDay: false },
      { date: '2026-10-08', bedtime: '23:00', wakeTime: '06:30', isFreeDay: false },
      { date: '2026-10-09', bedtime: '23:00', wakeTime: '06:30', isFreeDay: false },
      // Weekend: bed 02:00, wake 10:30 -> midsleep 06:15 (~3.5 hours later!)
      { date: '2026-10-10', bedtime: '02:00', wakeTime: '10:30', isFreeDay: true },
      { date: '2026-10-11', bedtime: '02:00', wakeTime: '10:30', isFreeDay: true },
    ];

    const result = calculateSleepConsistency(records);
    expect(result.hasMeaningfulSocialJetlag).toBe(true);
    expect(result.socialJetlagMinutes).toBeGreaterThan(120);
    expect(result.recommendation).toContain('Zidentyfikowano Social Jetlag');
  });
});
