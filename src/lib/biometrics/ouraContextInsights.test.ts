import { describe, expect, it } from 'vitest';
import { buildOuraContextInsights } from './ouraContextInsights';

describe('buildOuraContextInsights', () => {
  it('builds source-attributed context before bedtime', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28',
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      phoneUsage: { total_minutes: 214, late_night_minutes: 37 },
      workouts: [{ duration_minutes: 52, hr_strain_score: 68, end_time: '19:10' }],
      foodEntries: [
        { name: 'Kawa (95mg kofeiny)', calories: 5, food_quality_score: 7, logged_at: '2026-07-27T13:15:00+02:00' },
        { name: 'Kolacja', calories: 720, food_quality_score: 8, logged_at: '2026-07-27T20:40:00+02:00' },
      ],
    });

    expect(result.screen).toMatchObject({
      status: 'available',
      source: 'phone_usage_daily',
      lateNightMinutes: 37,
    });
    expect(result.caffeine).toMatchObject({
      status: 'available',
      source: 'daily_food_entries',
      amountMg: 95,
      lastAt: '13:15',
    });
    expect(result.meals).toMatchObject({
      status: 'available',
      calories: 725,
      lastAt: '20:40',
    });
    expect(result.training).toMatchObject({
      status: 'available',
      durationMinutes: 52,
      strainScore: 68,
    });
  });

  it('keeps missing sources explicit', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28',
      bedtimeStart: null,
      phoneUsage: null,
      workouts: [],
      foodEntries: [],
    });

    expect(result.screen.status).toBe('unavailable');
    expect(result.caffeine.status).toBe('unavailable');
    expect(result.meals.status).toBe('unavailable');
    expect(result.training.status).toBe('unavailable');
  });
});
