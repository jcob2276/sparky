import { describe, expect, it } from 'vitest';
import { calculateBedtimeTarget } from '@vanguard/domain';

describe('calculateBedtimeTarget', () => {
  it('computes bedtime with standard 88% efficiency and 15m latency', () => {
    // 480 min sleep / 0.88 = 545.45 -> 545 + 15 = 560 min in bed (~9h 20m)
    // wake 07:00 (420m from midnight). 420 - 560 = -140 -> 1300m = 21:40
    // wind down = 21:40 - 45m = 20:55
    const result = calculateBedtimeTarget({
      targetWakeTime: '07:00',
      targetSleepMinutes: 480,
      sleepEfficiencyPercent: 88,
      sleepLatencyMinutes: 15,
    });

    expect(result.recommendedBedtime).toBe('21:40');
    expect(result.recommendedWindDownTime).toBe('20:55');
    expect(result.inBedDurationMinutes).toBe(560);
    expect(result.latencyAssessment).toBe('optimal');
  });

  it('incorporates payback adjustment minutes into bedtime target', () => {
    const result = calculateBedtimeTarget({
      targetWakeTime: '06:30',
      targetSleepMinutes: 450, // 7.5h
      paybackAdjustmentMinutes: 30, // +30m payback -> 480 min effective
      sleepEfficiencyPercent: 90,
      sleepLatencyMinutes: 10,
    });
    // effective sleep need: 480 min. 480 / 0.90 = 533 + 10 = 543 min in bed (9h 03m)
    // wake 06:30 (390m). 390 - 543 = -153 -> 1287m = 21:27
    expect(result.targetSleepMinutes).toBe(480);
    expect(result.recommendedBedtime).toBe('21:27');
  });

  it('flags sleep_deprived when latency is under 7 minutes', () => {
    const result = calculateBedtimeTarget({
      sleepLatencyMinutes: 4,
    });
    expect(result.latencyAssessment).toBe('sleep_deprived');
    expect(result.latencyLabel).toContain('deficyt snu');
  });

  it('flags prolonged latency when time to fall asleep exceeds 25 minutes', () => {
    const result = calculateBedtimeTarget({
      sleepLatencyMinutes: 35,
    });
    expect(result.latencyAssessment).toBe('prolonged');
    expect(result.latencyLabel).toContain('hiperaktywacja');
  });
});
