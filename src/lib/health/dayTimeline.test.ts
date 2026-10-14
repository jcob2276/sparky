import { describe, it, expect } from 'vitest';
import { buildDayTimeline } from '@vanguard/domain';

describe('buildDayTimeline', () => {
  it('assembles sleep, running activity, and workout in chronological order', () => {
    const items = buildDayTimeline({
      date: '2026-10-14',
      sleep: {
        bedtime_start: '2026-10-14T01:30:00Z',
        bedtime_end: '2026-10-14T08:00:00Z',
        sleep_score: 82,
        total_sleep_hours: 6.5,
        hrv_average: 64,
      },
      activities: [
        {
          id: 'act-1',
          name: 'Bieg regeneracyjny Z2',
          sport_type: 'Run',
          start_date: '2026-10-14T11:00:00Z',
          distance: 6500,
          moving_time: 2100, // 35 min
          average_heartrate: 142,
          hr_max: 156,
        },
      ],
      workouts: [
        {
          id: 'w-1',
          name: 'Push A — Klatka / Barki',
          date: '2026-10-14',
          total_volume_kg: 5400,
          sets_count: 16,
        },
      ],
      recoveryHighMinutes: 45,
    });

    expect(items.length).toBe(4);
    // Chronology check: Sleep -> Run -> Restorative -> Workout
    expect(items[0].type).toBe('sleep');
    expect(items[0].metrics).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Wynik', value: '82' })])
    );
    expect(items[1].type).toBe('running');
    expect(items[1].durationFormatted).toBe('35 min');
    expect(items[2].type).toBe('restorative');
    expect(items[3].type).toBe('workout');
  });

  it('handles empty day gracefully without errors', () => {
    const items = buildDayTimeline({
      date: '2026-10-14',
      sleep: null,
      activities: [],
      workouts: [],
    });

    expect(items).toEqual([]);
  });
});
