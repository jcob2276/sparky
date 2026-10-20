import { describe, expect, it } from 'vitest';
import { mapNights, mapPhone, mapSessions, mapTop5 } from './mapRows';

describe('mapNights', () => {
  it('łączy enhanced z summary i liczy procent snu głębokiego', () => {
    const nights = mapNights(
      [{ date: '2026-10-10', sleep_score: 80, total_sleep_hours: 7.5, deep_sleep_hours: 1.5, sleep_efficiency: 90, sleep_average_hrv: null, sleep_latency_minutes: 12, bedtime_start: '2026-10-09T21:00:00Z' }],
      [
        { date: '2026-10-10', sleep_score: 70, total_sleep_hours: null, deep_sleep_hours: null, sleep_efficiency: null, hrv_avg: 44, latency_minutes: 99, bedtime_timestamp: null },
        { date: '2026-10-11', sleep_score: 65, total_sleep_hours: null, deep_sleep_hours: null, sleep_efficiency: null, hrv_avg: null, latency_minutes: null, bedtime_timestamp: null },
      ],
    );
    expect(nights).toHaveLength(2);
    expect(nights[0].outcomes).toMatchObject({ sleep_score: 80, sleep_h: 7.5, deep_sleep_pct: 20, sleep_hrv: 44, sleep_latency_min: 12 });
    expect(nights[0].bedtimeStart).toBe('2026-10-09T21:00:00Z');
    expect(nights[1].outcomes.deep_sleep_pct).toBeNull();
  });
});

describe('mapSessions', () => {
  it('scala ten sam trening z workout_sessions i Garmina (bez dubli)', () => {
    const { training } = mapSessions(
      [{ workout_day: 'Trening', start_time: '2026-10-15T16:00:00Z', end_time: '2026-10-15T17:00:00Z', duration_minutes: 60 }],
      [
        { start_date: '2026-10-15T16:02:00Z', elapsed_time: 3400, sport_type: 'Workout' },
        { start_date: '2026-10-16T05:00:00Z', elapsed_time: 1800, sport_type: 'Run' },
      ],
    );
    expect(training).toHaveLength(2);
    expect(training[0]).toEqual({ startMs: Date.parse('2026-10-15T16:00:00Z'), endMs: Date.parse('2026-10-15T17:00:00Z') });
  });

  it('rozdziela saunę od treningu i nie liczy Garmina nakładającego się na saunę', () => {
    const { training, sauna } = mapSessions(
      [
        { workout_day: 'Sauna', start_time: '2026-07-28T19:07:00Z', end_time: '2026-07-28T19:25:00Z', duration_minutes: 18 },
        { workout_day: 'Sauna', start_time: null, end_time: null, duration_minutes: 0 },
        { workout_day: 'Trening', start_time: '2026-07-27T16:00:00Z', end_time: null, duration_minutes: 60 },
      ],
      [
        { start_date: '2026-07-28T19:13:24Z', elapsed_time: 464, sport_type: 'Workout' },
        { start_date: '2026-07-30T05:00:00Z', elapsed_time: 1800, sport_type: 'Run' },
        { start_date: '2026-07-30T12:00:00Z', elapsed_time: 1800, sport_type: 'Walk' },
      ],
    );
    expect(sauna).toHaveLength(1);
    expect(training).toHaveLength(2);
    expect(training[0].endMs - training[0].startMs).toBe(60 * 60_000);
  });
});

describe('mapPhone', () => {
  it('czyta usage_buckets defensywnie', () => {
    const ok = Array.from({ length: 48 }, () => 1);
    const rows = mapPhone([
      { date: 'a', total_minutes: 10, usage_buckets: ok },
      { date: 'b', total_minutes: 10 },
      { date: 'c', total_minutes: 10, usage_buckets: [1, 2] },
    ]);
    expect(rows.map((r) => r.buckets !== null)).toEqual([true, false, false]);
  });
});

describe('mapTop5', () => {
  it('liczy odsetek tylko dla dni z co najmniej 3 zadaniami', () => {
    const days = mapTop5([
      { date: 'a', daily_win_tasks: [{ done: true }, { done: false }, { done: true }, { done: true }] },
      { date: 'b', daily_win_tasks: [{ done: true }, { done: true }] },
    ]);
    expect(days).toEqual([{ date: 'a', donePct: 75 }]);
  });
});
