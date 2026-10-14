import { describe, it, expect } from 'vitest';
import { computeZone2Weekly } from '@vanguard/domain';

describe('computeZone2Weekly', () => {
  it('accumulates Zone 2 seconds from activities of the current week', () => {
    // 2026-10-14 is Wednesday
    const activities = [
      {
        start_date: '2026-10-12T10:00:00Z', // Monday
        icu_hr_zone_times: [300, 2400, 600, 0, 0], // 2400s Z2 = 40 min
      },
      {
        start_date: '2026-10-14T09:00:00Z', // Wednesday
        icu_hr_zone_times: [200, 3600, 0, 0, 0], // 3600s Z2 = 60 min
      },
    ];

    const result = computeZone2Weekly(activities, '2026-10-14');

    expect(result.accumulatedMinutes).toBe(100);
    expect(result.targetMinutes).toBe(150);
    expect(result.percentage).toBe(67);
    expect(result.remainingMinutes).toBe(50);
    expect(result.status).toBe('on_track');

    const monday = result.dailyBreakdown.find((d) => d.dayName === 'Pn');
    expect(monday?.minutesZ2).toBe(40);

    const wednesday = result.dailyBreakdown.find((d) => d.dayName === 'Śr');
    expect(wednesday?.minutesZ2).toBe(60);
  });

  it('marks target achieved when over 150 min', () => {
    const activities = [
      {
        start_date: '2026-10-13T10:00:00Z',
        icu_hr_zone_times: [0, 9600, 0, 0, 0], // 160 min Z2
      },
    ];

    const result = computeZone2Weekly(activities, '2026-10-14');
    expect(result.accumulatedMinutes).toBe(160);
    expect(result.status).toBe('target_achieved');
    expect(result.remainingMinutes).toBe(0);
    expect(result.explanation).toContain('zrealizowany');
  });
});
