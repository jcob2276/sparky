import { describe, expect, it } from 'vitest';
import { calculateNetEnergy, estimateBMR } from '@vanguard/domain';

describe('netEnergy domain', () => {
  it('uses the recorded total expenditure without adding BMR or thermogenesis again', () => {
    const result = calculateNetEnergy({
      totalCaloriesBurned: 2500,
      activeCaloriesBurned: 600,
      caloriesConsumed: 2000,
    });
    expect(result.tdee).toBe(2500);
    expect(result.netKcal).toBe(-500);
    expect(result.bmr).toBeNull();
    expect(result.tef).toBe(0);
  });

  it('estimates BMR correctly with Mifflin-St Jeor defaults', () => {
    // 10*75 + 6.25*178 - 5*30 + 5 = 750 + 1112.5 - 150 + 5 = 1717.5 -> 1718
    const bmr = estimateBMR(75, 178, 30, 'male');
    expect(bmr).toBe(1718);
  });

  it('calculates balanced net energy when consumed matches TDEE', () => {
    const result = calculateNetEnergy({
      weightKg: 75,
      heightCm: 178,
      age: 30,
      sex: 'male',
      activeCaloriesBurned: 500,
      caloriesConsumed: 2400, // bmr ~1718 + 500 + 240 = 2458 -> net ~ -58
      targetGoal: 'maintenance',
    });

    expect(result.status).toBe('balanced');
    expect(result.isGoalAligned).toBe(true);
    expect(result.tef).toBe(240);
  });

  it('detects caloric deficit and computes weekly weight trajectory', () => {
    const result = calculateNetEnergy({
      bmrOverride: 1800,
      activeCaloriesBurned: 700,
      caloriesConsumed: 2000,
      targetGoal: 'deficit',
    });
    // tdee = 1800 + 700 + 200 = 2700
    // net = 2000 - 2700 = -700 kcal/day
    // weekly delta = (-700 * 7) / 7700 = -0.63 kg
    expect(result.tdee).toBe(2700);
    expect(result.netKcal).toBe(-700);
    expect(result.status).toBe('deficit');
    expect(result.isGoalAligned).toBe(true);
    expect(result.projectedWeeklyKgDelta).toBe(-0.64); // -4900 / 7700 = -0.636... -> -0.64
  });

  it('detects caloric surplus when calories exceed expenditure', () => {
    const result = calculateNetEnergy({
      bmrOverride: 1700,
      activeCaloriesBurned: 300,
      caloriesConsumed: 3200,
      targetGoal: 'surplus',
    });
    // tdee = 1700 + 300 + 320 = 2320
    // net = 3200 - 2320 = +880 kcal
    expect(result.status).toBe('surplus');
    expect(result.netKcal).toBe(880);
    expect(result.isGoalAligned).toBe(true);
    expect(result.projectedWeeklyKgDelta).toBeGreaterThan(0.5);
  });
});
