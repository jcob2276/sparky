import { describe, expect, it } from 'vitest';
import {
  avgClockLabel,
  bodyPulseHeadline,
  buildWeeklyBodyPulse,
  EMPTY_WEEKLY_BODY_PULSE,
  formatDurationHours,
  formatSleepDayLabel,
} from './weeklyBodyPulse';

describe('buildWeeklyBodyPulse', () => {
  it('excludes dates outside the seven-day window from activity and sleep totals', () => {
    const data = buildWeeklyBodyPulse({
      since: '2026-07-13',
      sessions: [{ date: '2026-07-12' }, { date: '2026-07-19' }, { date: '2026-07-20' }],
      strava: [
        { start_date: '2026-07-19T12:00:00Z', sport_type: 'Run', distance: 1000 },
        { start_date: '2026-07-20T12:00:00Z', sport_type: 'Run', distance: 9000 },
        { start_date: '2026-07-20T12:00:00Z', sport_type: 'Sauna', distance: 0, elapsed_time: 1200 },
      ],
      oura: [
        { date: '2026-07-19', total_sleep_hours: 7, sleep_score: 70 },
        { date: '2026-07-20', total_sleep_hours: 10, sleep_score: 100 },
      ], strain: [],
    });
    expect(data).toMatchObject({ gymCount: 1, runCount: 1, runKm: 1, saunaCount: 0, sleepAvgHours: 7, sleepAvgScore: 70 });
  });
  it('assigns timestamped runs to their Warsaw day at both window edges', () => {
    const data = buildWeeklyBodyPulse({
      since: '2026-07-13', sessions: [], oura: [], strain: [],
      strava: [
        { start_date: '2026-07-12T22:30:00Z', sport_type: 'Run', distance: 1000 },
        { start_date: '2026-07-19T22:30:00Z', sport_type: 'Run', distance: 9000 },
      ],
    });
    expect(data).toMatchObject({ runCount: 1, runKm: 1 });
  });
  it('splits gym, sauna, runs and sleep extremes over 7 days', () => {
    const data = buildWeeklyBodyPulse({
      since: '2026-07-13',
      sessions: [
        {
          date: '2026-07-14',
          workout_day: 'Nogi',
          exercise_logs: [{ exercise_name: 'Squat', muscle_tags: ['quads'], reps: 8 }],
        },
        {
          date: '2026-07-15',
          workout_day: 'Sauna',
          exercise_logs: [{ exercise_name: 'Sauna', muscle_tags: ['wellness'], reps: 20 }],
        },
      ],
      strava: [
        { start_date: '2026-07-16T07:00:00+02:00', sport_type: 'Run', distance: 5200 },
        { start_date: '2026-07-17T07:00:00+02:00', sport_type: 'Ride', distance: 20000 },
      ],
      oura: [
        {
          date: '2026-07-14',
          total_sleep_hours: 7.8,
          sleep_score: 88,
          bedtime_timestamp: '2026-07-13T22:30:00+02:00',
          bedtime_end_timestamp: '2026-07-14T06:30:00+02:00',
          deep_sleep_hours: 1.8,
          rem_sleep_hours: 1.5,
          sleep_efficiency: 90,
          hrv_avg: 55,
          latency_minutes: 12,
          readiness_score: 80,
        },
        {
          date: '2026-07-15',
          total_sleep_hours: 5.4,
          sleep_score: 62,
          bedtime_timestamp: '2026-07-15T00:30:00+02:00',
          bedtime_end_timestamp: '2026-07-15T06:00:00+02:00',
          deep_sleep_hours: 0.9,
          rem_sleep_hours: 0.8,
          sleep_efficiency: 78,
          hrv_avg: 41,
          latency_minutes: 20,
          readiness_score: 58,
        },
        {
          date: '2026-07-16',
          total_sleep_hours: 7.1,
          sleep_score: 74,
          bedtime_timestamp: '2026-07-15T23:00:00+02:00',
          bedtime_end_timestamp: '2026-07-16T06:15:00+02:00',
          deep_sleep_hours: 1.4,
          rem_sleep_hours: 1.2,
          sleep_efficiency: 85,
          hrv_avg: 48,
          latency_minutes: 15,
          readiness_score: 70,
        },
      ],
      strain: [
        { recovery_score: 60, daily_status: 'yellow' },
        { recovery_score: 70, daily_status: 'green' },
      ],
    });

    expect(data.gymCount).toBe(1);
    expect(data.saunaCount).toBe(1);
    expect(data.saunaMinutes).toBe(20);
    expect(data.runCount).toBe(1);
    expect(data.runKm).toBe(5.2);
    expect(data.sleepAvgHours).toBe(6.8);
    expect(data.sleepBest?.date).toBe('2026-07-14');
    expect(data.sleepWorst?.date).toBe('2026-07-15');
    expect(data.avgBedtime).toBe('23:20');
    expect(data.avgWake).toBe('06:15');
    expect(data.avgDeepHours).toBe(1.4);
    expect(data.avgRemHours).toBe(1.2);
    expect(data.avgEfficiency).toBe(84);
    expect(data.avgHrv).toBe(48);
    expect(data.avgLatencyMin).toBe(16);
    expect(data.avgReadiness).toBe(69);
    expect(data.averageRecovery).toBe(65);
    expect(data.warningDays).toBe(1);
  });
});

describe('avgClockLabel', () => {
  it('ignores broken timestamps without crashing the weekly summary', () => {
    expect(avgClockLabel(['not-a-date', '2026-07-13T23:00:00+02:00'])).toBe('23:00');
    expect(avgClockLabel(['not-a-date'])).toBeNull();
  });
  it('averages bedtimes across midnight', () => {
    expect(avgClockLabel(['2026-07-13T23:00:00+02:00', '2026-07-15T01:00:00+02:00'], true)).toBe('00:00');
  });

  it('safely ignores invalid timestamps without throwing RangeError', () => {
    expect(avgClockLabel(['invalid-date', '', '2026-07-13T23:00:00+02:00'], true)).toBe('23:00');
    expect(avgClockLabel(['nonsense', 'not-a-date'], true)).toBeNull();
  });
});

describe('buildWeeklyBodyPulse date bounds', () => {
  it('ignores future records beyond the until date', () => {
    const data = buildWeeklyBodyPulse({
      since: '2026-07-10',
      until: '2026-07-15',
      sessions: [
        { date: '2026-07-12', workout_day: 'Trening', exercise_logs: [{ exercise_name: 'Bench', reps: 10 }] },
        { date: '2026-07-20', workout_day: 'Przyszły trening', exercise_logs: [{ exercise_name: 'Bench', reps: 10 }] },
      ],
      strava: [
        { start_date: '2026-07-11T08:00:00Z', sport_type: 'Run', distance: 5000 },
        { start_date: '2026-07-18T08:00:00Z', sport_type: 'Run', distance: 10000 },
      ],
      oura: [
        { date: '2026-07-12', total_sleep_hours: 8, sleep_score: 85 },
        { date: '2026-07-19', total_sleep_hours: 9, sleep_score: 95 },
      ],
      strain: [],
    });

    expect(data.gymCount).toBe(1);
    expect(data.runCount).toBe(1);
    expect(data.runKm).toBe(5);
    expect(data.sleepAvgHours).toBe(8);
  });
});

describe('bodyPulseHeadline', () => {
  it('flags low sleep before activity praise', () => {
    expect(bodyPulseHeadline({
      ...EMPTY_WEEKLY_BODY_PULSE,
      gymCount: 4,
      runCount: 2,
      runKm: 20,
      saunaCount: 1,
      saunaMinutes: 15,
      sleepAvgHours: 6.0,
      sleepAvgScore: 60,
      averageRecovery: 70,
    })).toBe('Sen ciągnie w dół ostatnie 7 dni');
  });
});

describe('formatDurationHours', () => {
  it('converts decimal hours to h + m', () => {
    expect(formatDurationHours(1.7)).toBe('1h 42m');
    expect(formatDurationHours(7.0)).toBe('7h');
    expect(formatDurationHours(0.5)).toBe('30m');
  });
});

describe('formatSleepDayLabel', () => {
  it('renders hours with day label', () => {
    expect(formatSleepDayLabel({ date: '2026-07-19', hours: 7.5, score: 80 }, '2026-07-19')).toBe('7h 30m · Dziś');
  });
});
