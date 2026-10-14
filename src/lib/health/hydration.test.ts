import { describe, it, expect } from 'vitest';
import {
  calculateDynamicHydration,
  estimateSweatLossMl,
} from '@vanguard/domain';

describe('hydration', () => {
  it('estimates sweat loss accurately from calories and duration', () => {
    // 500 kcal + 60 min workout -> 500 * 0.9 = 450 + 150 = 600 ml
    const sweat = estimateSweatLossMl(500, 60);
    expect(sweat).toBe(600);
  });

  it('adjusts dynamic hydration target with sweat loss', () => {
    const result = calculateDynamicHydration({
      baseTargetMl: 2500,
      loggedIntakeMl: 2000,
      activeCalories: 500,
      workoutDurationMinutes: 60,
    });

    // Base 2500 + 600 ml sweat loss = 3100 ml dynamic target
    expect(result.dynamicTargetMl).toBe(3100);
    expect(result.sweatLossMl).toBe(600);
    expect(result.remainingMl).toBe(1100);
    expect(result.percentage).toBe(65);
    expect(result.status).toBe('on_track');
  });

  it('triggers electrolyte recommendation on heavy sweat loss sessions', () => {
    const result = calculateDynamicHydration({
      baseTargetMl: 2500,
      loggedIntakeMl: 1000,
      activeCalories: 900,
      workoutDurationMinutes: 90,
    });

    // Sweat loss > 750 ml
    expect(result.needsElectrolytes).toBe(true);
    expect(result.electrolyteAdvisory).toContain('Zalecana suplementacja sodu');
    expect(result.status).toBe('dehydration_risk');
  });
});
