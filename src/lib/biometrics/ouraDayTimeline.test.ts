import { describe, expect, it } from 'vitest';
import { buildDayNightTimeline, type DayNightRaw } from './ouraDayTimeline';

// 2026-10-18 is still CEST (UTC+2): 06:00 Warsaw on 17th = 04:00Z.
const base: DayNightRaw = {
  nightDate: '2026-10-18',
  bedtimeStart: '2026-10-17T23:03:57Z',
  bedtimeEnd: '2026-10-18T06:36:57Z',
  phases: [],
  heartRate: [],
  hrv: [],
  foodEntries: [],
  supplementLogs: [],
  stravaActivities: [],
  workoutSessions: [],
};

describe('buildDayNightTimeline', () => {
  it('builds the window from 06:00 Warsaw the previous day to wake time', () => {
    const t = buildDayNightTimeline(base);
    expect(t.windowStart).toBe('2026-10-17T04:00:00.000Z');
    expect(t.windowEnd).toBe('2026-10-18T06:36:57.000Z');
    expect(t.sleepStart).toBe('2026-10-17T23:03:57.000Z');
  });

  it('falls back to 10:00 Warsaw without sleep and handles winter time', () => {
    const t = buildDayNightTimeline({ ...base, nightDate: '2026-12-10', bedtimeStart: null, bedtimeEnd: null });
    expect(t.sleepStart).toBeNull();
    expect(t.windowStart).toBe('2026-12-09T05:00:00.000Z');
    expect(t.windowEnd).toBe('2026-12-10T09:00:00.000Z');
    expect(t.summary.caffeineAtBedtimeMg).toBeNull();
  });

  it('merges phase blocks into segments and clips to the sleep interval', () => {
    const t = buildDayNightTimeline({
      ...base,
      bedtimeEnd: '2026-10-17T23:18:57Z',
      phases: [
        { ts: '2026-10-17T23:03:57Z', phase: null, phase_code: 4 },
        { ts: '2026-10-17T23:08:57Z', phase: null, phase_code: 2 },
        { ts: '2026-10-17T23:13:57Z', phase: null, phase_code: 2 },
        { ts: '2026-10-17T23:18:57Z', phase: null, phase_code: 1 },
      ],
    });
    expect(t.sleepSegments.map((s) => s.stage)).toEqual(['awake', 'light']);
    expect(t.sleepSegments[1].end).toBe('2026-10-17T23:18:57.000Z');
  });

  it('downsamples HR and HRV to at most 200 points and drops empty values', () => {
    const start = Date.parse('2026-10-17T23:04:00Z');
    const rows = Array.from({ length: 450 }, (_, i) => ({ ts: new Date(start + i * 60_000).toISOString(), bpm: 50 + (i % 5), hrv: 40 }));
    const t = buildDayNightTimeline({
      ...base,
      heartRate: [...rows.map((r) => ({ ts: r.ts, bpm: r.bpm })), { ts: '2026-10-18T00:00:30Z', bpm: null }],
      hrv: rows.map((r) => ({ ts: r.ts, hrv: r.hrv })),
    });
    expect(t.hr.length).toBeLessThanOrEqual(200);
    expect(t.hrv.length).toBeLessThanOrEqual(200);
    expect(t.hrv.every((p) => p.value === 40)).toBe(true);
  });

  it('creates caffeine markers, a decay curve and bedtime estimate', () => {
    const t = buildDayNightTimeline({
      ...base,
      foodEntries: [
        { id: 'a', name: 'Kawa (100mg kofeiny)', calories: 5, logged_at: '2026-10-17T11:03:57Z', meal_group_id: 'g1' },
      ],
    });
    const marker = t.markers.find((m) => m.kind === 'caffeine');
    expect(marker?.caffeineMg).toBe(100);
    expect(t.markers.some((m) => m.kind === 'meal')).toBe(false);
    // 12 h before bedtime with 5.5 h half-life.
    expect(t.summary.caffeineAtBedtimeMg).toBe(Math.round(100 * Math.pow(0.5, 12 / 5.5)));
    expect(t.summary.totalCaffeineMg).toBe(100);
    expect(t.summary.lastCaffeineAt).toBe('2026-10-17T11:03:57.000Z');
    const peak = t.caffeineInBody.find((p) => p.at === '2026-10-17T11:04:00.000Z');
    expect(peak).toBeUndefined();
    expect(Math.max(...t.caffeineInBody.map((p) => p.value))).toBeLessThanOrEqual(100);
    expect(t.caffeineInBody[0].at).toBe(t.windowStart);
  });

  it('groups food by meal_group_id and ignores entries after wake or without time', () => {
    const t = buildDayNightTimeline({
      ...base,
      foodEntries: [
        { id: '1', name: 'Kotlet', calories: 500, logged_at: '2026-10-17T13:37:00Z', meal_group_id: 'g' },
        { id: '2', name: 'Frytki', calories: 300, logged_at: '2026-10-17T13:37:00Z', meal_group_id: 'g' },
        { id: '3', name: 'Bez czasu', calories: 100, logged_at: null, meal_group_id: null },
        { id: '4', name: 'Za późno', calories: 100, logged_at: '2026-10-18T12:00:00Z', meal_group_id: 'x' },
      ],
    });
    const meals = t.markers.filter((m) => m.kind === 'meal');
    expect(meals).toHaveLength(1);
    expect(meals[0].detail).toBe('2 pozycje · 800 kcal');
    expect(t.summary.lastMealAt).toBe('2026-10-17T13:37:00.000Z');
  });

  it('adds supplement and workout markers, de-duplicating gym vs Strava overlap', () => {
    const t = buildDayNightTimeline({
      ...base,
      supplementLogs: [
        { id: 's1', logged_at: '2026-10-17T19:00:00Z', quantity: 2, name: 'Magnez' },
        { id: 's2', logged_at: '2026-10-17T19:05:00Z', quantity: 1, name: 'Magnez' },
      ],
      stravaActivities: [{ strava_id: 1, name: 'Kardio', sport_type: 'Workout', start_date: '2026-10-17T18:31:11Z', moving_time: 6000, elapsed_time: 6725 }],
      workoutSessions: [
        { id: 'w1', start_time: '2026-10-17T18:35:00Z', end_time: '2026-10-17T20:00:00Z', duration_minutes: 85 },
        { id: 'w2', start_time: '2026-10-17T08:00:00Z', end_time: null, duration_minutes: 45 },
      ],
    });
    expect(t.summary.supplementsTaken).toEqual(['Magnez']);
    expect(t.markers.find((m) => m.id === 's1' || m.id === 'supplement:s1')?.detail).toBe('2×');
    const workouts = t.markers.filter((m) => m.kind === 'workout');
    expect(workouts.map((w) => w.id)).toEqual(['workout:session:w2', 'workout:strava:1']);
    expect(workouts[1].detail).toBe('100 min');
  });
});
