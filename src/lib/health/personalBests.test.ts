import { describe, it, expect } from 'vitest';
import {
  extractRunningPBs,
  extractBiometricPBs,
  buildPersonalBestsSummary,
} from '@vanguard/domain';

describe('personalBests', () => {
  it('extracts running PBs for standard distances', () => {
    const activities = [
      { name: 'Szybka piątka', distance: 5020, moving_time: 1200, start_date: '2026-09-15T08:00:00Z' }, // ~20 min for 5k
      { name: 'Wolniejszy bieg', distance: 5000, moving_time: 1500, start_date: '2026-09-01T08:00:00Z' },
      { name: 'Bieg 10 km', distance: 10100, moving_time: 2500, start_date: '2026-10-01T08:00:00Z' }, // ~41:15 for 10k
    ];

    const pbs = extractRunningPBs(activities);
    expect(pbs.length).toBe(2);

    const fiveK = pbs.find((p) => p.distanceLabel === '5 km');
    expect(fiveK).toBeDefined();
    expect(fiveK?.timeSeconds).toBeLessThan(1210);
    expect(fiveK?.achievedAt).toBe('2026-09-15');

    const tenK = pbs.find((p) => p.distanceLabel === '10 km');
    expect(tenK).toBeDefined();
    expect(tenK?.achievedAt).toBe('2026-10-01');
  });

  it('extracts biometric PBs from historical records', () => {
    const biometrics = [
      { date: '2026-09-10', hrv: 75, resting_hr: 48, deep_sleep_minutes: 90, strain: 12.0 },
      { date: '2026-09-20', hrv: 92, resting_hr: 44, deep_sleep_minutes: 110, strain: 16.5 },
      { date: '2026-10-05', hrv: 80, resting_hr: 42, deep_sleep_minutes: 105, strain: 14.0 },
    ];

    const pbs = extractBiometricPBs(biometrics);
    const hrvPB = pbs.find((p) => p.metricKey === 'highest_hrv');
    expect(hrvPB?.value).toBe(92);
    expect(hrvPB?.achievedAt).toBe('2026-09-20');

    const rhrPB = pbs.find((p) => p.metricKey === 'lowest_rhr');
    expect(rhrPB?.value).toBe(42);
    expect(rhrPB?.achievedAt).toBe('2026-10-05');
  });

  it('builds combined summary with total count and most recent PR', () => {
    const running = [
      { distanceLabel: '5 km' as const, targetMeters: 5000, timeSeconds: 1200, paceStr: '4:00 /km', achievedAt: '2026-09-15' },
    ];
    const strength = [
      { liftKey: 'bench_press', liftName: 'Wyciskanie leżąc', weightKg: 105, reps: 5, estimated1RM: 122.5, achievedAt: '2026-10-08' },
    ];
    const biometrics = [
      { metricKey: 'highest_hrv' as const, label: 'Najwyższe HRV', value: 92, unit: 'ms', achievedAt: '2026-10-01' },
    ];

    const summary = buildPersonalBestsSummary(running, strength, biometrics);
    expect(summary.totalRecordsCount).toBe(3);
    expect(summary.recentRecord?.category).toBe('strength');
    expect(summary.recentRecord?.title).toContain('Wyciskanie leżąc (105 kg)');
  });
});
