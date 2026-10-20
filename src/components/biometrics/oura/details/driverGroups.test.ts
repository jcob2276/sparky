import { describe, expect, it } from 'vitest';
import { sleepDriversFixture } from '../../../../lib/biometrics/sleepDrivers/sleepDrivers.fixture';
import type { DriverEffect } from '../../../../lib/biometrics/sleepDrivers/types';
import { describeRho, driversWithoutConclusions, formatNumber, groupEffectsByDriver } from './driverGroups';

const effect = (over: Partial<DriverEffect>): DriverEffect => ({
  id: 'x', driver: 'meal_gap_h', outcome: 'sleep_score', n: 30, rho: 0.3, pValue: 0.1,
  strength: 'tentative', direction: 'hurts', split: null, headline: 'h', ...over,
});

describe('groupEffectsByDriver', () => {
  it('drops insufficient effects and orders by strength then outcome', () => {
    const groups = groupEffectsByDriver([
      effect({ driver: 'meal_gap_h', outcome: 'sleep_h', strength: 'tentative' }),
      effect({ driver: 'meal_gap_h', outcome: 'sleep_score', strength: 'confirmed' }),
      effect({ driver: 'pc_active_h', strength: 'insufficient' }),
      effect({ driver: 'training_gap_h', strength: 'probable' }),
    ]);
    expect(groups.map((g) => g.driver)).toEqual(['meal_gap_h', 'training_gap_h']);
    expect(groups[0].effects.map((e) => e.outcome)).toEqual(['sleep_score', 'sleep_h']);
  });

  it('works on the fixture', () => {
    expect(groupEffectsByDriver(sleepDriversFixture.effects).map((g) => g.driver))
      .toEqual(['training_gap_h', 'phone_evening_min']);
  });
});

describe('driversWithoutConclusions', () => {
  it('lists covered drivers lacking any non-insufficient effect', () => {
    expect(driversWithoutConclusions(sleepDriversFixture.effects, sleepDriversFixture.coverage))
      .toEqual(['pc_active_h']);
  });
});

describe('formatting', () => {
  it('describes rho in words', () => {
    expect(describeRho(null)).toContain('brak');
    expect(describeRho(-0.31)).toBe('słaby związek (ρ = −0,31)');
    expect(describeRho(0.7)).toContain('wyraźny');
  });
  it('formats numbers with Polish separators', () => {
    expect(formatNumber(-3.5, 1, true)).toBe('−3,5');
    expect(formatNumber(4, 1, true)).toBe('+4');
  });
});
