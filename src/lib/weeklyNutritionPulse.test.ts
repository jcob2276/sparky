import { describe, expect, it } from 'vitest';
import {
  buildWeeklyNutritionPulse,
  formatGrams,
  nutritionPulseHeadline,
} from './weeklyNutritionPulse';

describe('buildWeeklyNutritionPulse', () => {
  it('averages macros over logged days only', () => {
    const pulse = buildWeeklyNutritionPulse({
      proteinGoal: 150,
      kcalTarget: 1800,
      today: '2026-07-17',
      rows: [
        {
          date: '2026-07-14',
          calories: 1600,
          protein: 120,
          carbs: 140,
          fat: 55,
          fiber: 22,
          sugar: 30,
          avg_food_quality: 70,
          insulin_load: 40,
        },
        {
          date: '2026-07-15',
          calories: 0,
          protein: 0,
          carbs: null,
          fat: null,
          fiber: null,
          sugar: null,
          avg_food_quality: null,
          insulin_load: null,
        },
        {
          date: '2026-07-16',
          calories: 1400,
          protein: 90,
          carbs: 100,
          fat: 45,
          fiber: 18,
          sugar: 20,
          avg_food_quality: 55,
          insulin_load: 35,
        },
      ],
    });

    expect(pulse.loggedDays).toBe(2);
    expect(pulse.avgCalories).toBe(1500);
    expect(pulse.avgProtein).toBe(105);
    expect(pulse.avgCarbs).toBe(120);
    expect(pulse.avgFat).toBe(50);
    expect(pulse.avgFiber).toBe(20);
    expect(pulse.avgSugar).toBe(25);
    expect(pulse.avgQuality).toBe(63);
    expect(pulse.avgInsulin).toBe(38);
    expect(pulse.caloriesDeltaPct).toBe(-17);
    expect(pulse.proteinOnTrack).toBe(false);
  });
});

describe('buildWeeklyNutritionPulse — day counting', () => {
  const row = (date: string, calories: number | null, protein: number | null) => ({
    date, calories, protein, carbs: null, fat: null, fiber: null, sugar: null, avg_food_quality: null, insulin_load: null,
  });

  it('counts days that have food entries without any manual day closing', () => {
    const pulse = buildWeeklyNutritionPulse({
      proteinGoal: 152,
      kcalTarget: 2461,
      today: '2026-10-19',
      rows: [row('2026-10-14', 1802, 65), row('2026-10-15', 2380, 95), row('2026-10-16', 2866, 98), row('2026-10-18', 2295, 102)],
    });
    expect(pulse.loggedDays).toBe(4);
    expect(pulse.avgProtein).toBe(90);
    expect(pulse.avgCalories).toBe(2336);
  });

  it('ignores today (in progress) and empty days', () => {
    const pulse = buildWeeklyNutritionPulse({
      proteinGoal: null,
      kcalTarget: null,
      today: '2026-10-19',
      rows: [row('2026-10-17', 0, 0), row('2026-10-18', 2000, 100), row('2026-10-19', 1224, 59)],
    });
    expect(pulse.loggedDays).toBe(1);
    expect(pulse.avgCalories).toBe(2000);
  });
});

describe('nutritionPulseHeadline', () => {
  it('prioritizes missing days', () => {
    expect(nutritionPulseHeadline({
      loggedDays: 2,
      avgCalories: 1500,
      avgProtein: 105,
      avgCarbs: 120,
      avgFat: 50,
      avgFiber: 20,
      avgSugar: 25,
      avgQuality: 63,
      avgInsulin: 38,
      caloriesDeltaPct: -17,
      proteinGoal: 150,
      kcalTarget: 1800,
      proteinOnTrack: false,
    })).toBe('Za mało zapisanych dni');
  });
});

describe('formatGrams', () => {
  it('formats grams', () => {
    expect(formatGrams(105)).toBe('105 g');
    expect(formatGrams(null)).toBe('—');
  });
});
