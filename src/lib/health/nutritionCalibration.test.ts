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
      '2026-01-14',
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
  it('requires complete intake to overlap the weight window and rejects stale or duplicated evidence', () => {
    const intake = Array.from({length:14},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,'0')}`,calories:2000}));
    const reviews = intake.map(day=>({date:day.date,completeness:'complete' as const}));
    expect(calibrateNutrition(intake,[{date:'2026-02-01',weight_kg:80},{date:'2026-02-15',weight_kg:79}],reviews,'2026-02-15').status).toBe('collecting');
    expect(calibrateNutrition(intake,[{date:'2026-01-01',weight_kg:80},{date:'2026-01-14',weight_kg:79}],reviews,'2026-02-15').status).toBe('collecting');
    expect(calibrateNutrition(Array(14).fill(intake[0]),[{date:'2026-01-01',weight_kg:80},{date:'2026-01-14',weight_kg:79}],reviews,'2026-01-14').loggedDays).toBe(1);
  });
});
