import { describe, expect, it } from 'vitest';
import { calibrateNutrition } from './nutritionCalibration';

describe('nutrition calibration', () => {
  it('waits for enough evidence', () => {
    expect(calibrateNutrition(
      [{ date: '2026-01-01', calories: 2000 }],
      [],
      [{ date: '2026-01-01', completeness: 'complete' }],
    ).status).toBe('collecting');
  });

  it('calculates an observed weekly trend without claiming TDEE', () => {
    const days = Array.from({ length: 14 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, calories: 2000 }));
    const reviews = days.map((day) => ({ date: day.date, completeness: 'complete' as const }));
    const result = calibrateNutrition(
      days,
      [{ date: '2026-01-01', weight_kg: 80 }, { date: '2026-01-14', weight_kg: 79 }],
      reviews,
    );
    expect(result.status).toBe('ready');
    expect(result.weeklyWeightChangeKg).toBeLessThan(0);
  });

  it('never treats calorie volume as proof that a day is complete', () => {
    const intake = [
      { date: '2026-01-01', calories: 2400 },
      { date: '2026-01-02', calories: 2300 },
    ];
    const result = calibrateNutrition(intake, [], [
      { date: '2026-01-01', completeness: 'partial' },
      { date: '2026-01-02', completeness: 'unknown' },
    ]);
    expect(result.loggedDays).toBe(0);
    expect(result.averageCalories).toBeNull();
  });
});
