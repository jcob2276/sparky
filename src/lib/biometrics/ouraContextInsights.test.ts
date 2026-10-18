import { describe, expect, it } from 'vitest';
import { buildOuraContextInsights } from './ouraContextInsights';

describe('buildOuraContextInsights pre-sleep timing', () => {
  it('excludes entries after sleep starts from pre-sleep timing and caffeine estimates', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-10-15', bedtimeStart: '2026-10-15T23:00:00+02:00', phoneUsage: null, workouts: [],
      foodEntries: [{ name: 'Kawa (100mg)', calories: 5, food_quality_score: null, logged_at: '2026-10-15T23:30:00+02:00' }],
    });
    expect(result.caffeine.hoursBeforeBedtime).toBeNull();
    expect(result.caffeine.remainingMgAtBedtime).toBeNull();
    expect(result.meals.hoursBeforeBedtime).toBeNull();
    expect(result.meals.lastAt).toBeNull();
  });

  it('keeps remaining caffeine unknown when a dose has no timestamp', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-10-15', bedtimeStart: '2026-10-15T23:00:00+02:00', phoneUsage: null, workouts: [],
      foodEntries: [{ name: 'Kawa (100mg)', calories: 5, food_quality_score: null, logged_at: null }],
    });
    expect(result.caffeine.remainingMgAtBedtime).toBeNull();
  });
});

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
      totalMinutes: 214,
      formattedTotal: '3h 34m',
      lateNightMinutes: 37,
      lateNightImpact: { tier: 'moderate' },
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

  it('marks name-based caffeine as an estimate and entry time as logged time', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null, phoneUsage: null, workouts: [],
      foodEntries: [{ name: 'Kawa', calories: 5, food_quality_score: null, logged_at: '2026-07-27T13:15:00+02:00' }],
    });
    expect(result.caffeine).toMatchObject({
      amountMg: 95,
      lastAt: '13:15',
      isEstimate: true,
      halfLifeHours: 5.5,
    });
    expect(result.caffeine.estimateNotice).toContain('Szacunek z wpisów jedzenia (model half-life ~5.5h)');
  });

  it('calculates caffeine decay half-life and meal timing relative to bedtime start', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28',
      bedtimeStart: '2026-07-27T23:30:00+02:00',
      phoneUsage: null,
      workouts: [],
      foodEntries: [
        { name: 'Kawa (100mg)', calories: 5, food_quality_score: null, logged_at: '2026-07-27T18:00:00+02:00' },
        { name: 'Kolacja', calories: 600, food_quality_score: 8, logged_at: '2026-07-27T20:30:00+02:00' },
      ],
    });

    // 18:00 to 23:30 is 5.5 hours = exactly one half-life (100mg -> 50mg)
    expect(result.caffeine.hoursBeforeBedtime).toBe(5.5);
    expect(result.caffeine.remainingMgAtBedtime).toBe(50);
    expect(result.caffeine.isEstimate).toBe(true);

    // 20:30 to 23:30 is 3.0 hours before bedtime
    expect(result.meals.hoursBeforeBedtime).toBe(3.0);
    expect(result.meals.lastAt).toBe('20:30');
  });

  it('does not treat absent category minutes as measured zeros', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null,
      phoneUsage: { total_minutes: 100, late_night_minutes: null }, workouts: [], foodEntries: [],
    });
    expect(result.screen.lateNightImpact).toBeNull();
    expect(result.screen.categoryMinutesComplete).toBe(false);
  });

  it('marks a phone usage row without total minutes as unavailable', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null,
      phoneUsage: { total_minutes: null, late_night_minutes: null }, workouts: [], foodEntries: [],
    });
    expect(result.screen.status).toBe('unavailable');
  });

  it.each([Number.NaN, -1])('rejects invalid total screen minutes: %s', (totalMinutes) => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null,
      phoneUsage: { total_minutes: totalMinutes, late_night_minutes: 0 }, workouts: [], foodEntries: [],
    });
    expect(result.screen.status).toBe('unavailable');
  });

  it.each([Number.NaN, -1])('does not treat invalid category minutes as a complete breakdown: %s', (minutes) => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null,
      phoneUsage: {
        total_minutes: 100, late_night_minutes: 0,
        social_minutes: minutes, messaging_minutes: 10, entertainment_minutes: 10,
        ai_minutes: 10, browser_minutes: 10,
      }, workouts: [], foodEntries: [],
    });
    expect(result.screen.categoryMinutesComplete).toBe(false);
  });

  it('does not require hidden other minutes for the visible category breakdown', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null,
      phoneUsage: {
        total_minutes: 100, late_night_minutes: 0,
        social_minutes: 10, messaging_minutes: 10, entertainment_minutes: 10,
        ai_minutes: 10, browser_minutes: 10,
      }, workouts: [], foodEntries: [],
    });
    expect(result.screen.categoryMinutesComplete).toBe(true);
  });

  it('handles 0 late_night_minutes cleanly with an explicit 0 min impact object', () => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null,
      phoneUsage: { total_minutes: 90, late_night_minutes: 0 },
      workouts: [], foodEntries: [],
    });
    expect(result.screen.lateNightMinutes).toBe(0);
    expect(result.screen.lateNightImpact).not.toBeNull();
    expect(result.screen.lateNightImpact?.minutes).toBe(0);
    expect(result.screen.lateNightImpact?.badge).toBe('0 min');
  });

  it.each([Number.NaN, -5])('sanitizes invalid late_night_minutes (%s) cleanly to null', (invalidVal) => {
    const result = buildOuraContextInsights({
      sleepDate: '2026-07-28', bedtimeStart: null,
      phoneUsage: { total_minutes: 90, late_night_minutes: invalidVal },
      workouts: [], foodEntries: [],
    });
    expect(result.screen.lateNightMinutes).toBeNull();
    expect(result.screen.lateNightImpact).toBeNull();
  });
});
