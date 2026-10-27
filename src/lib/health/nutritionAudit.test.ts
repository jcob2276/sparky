import { describe, expect, it } from 'vitest';
import { auditNutritionDay, computeDayEnergyRange } from './nutritionAudit';

describe('nutrition day audit', () => {
  it('penalizes estimates without marking them as missing', () => {
    const audit = auditNutritionDay([{ calories: 200, parse_meta: { trust_level: 'estimated' } }]);
    expect(audit.uncertainEntries).toBe(1);
    expect(audit.incompleteEntries).toBe(0);
  });

  it('recognizes confirmed days', () => {
    expect(auditNutritionDay([{ calories: 200, parse_meta: { trust_level: 'confirmed' } }]).score).toBe(100);
  });
});

describe('day energy range', () => {
  it('returns null for a day with no energy', () => {
    expect(computeDayEnergyRange([])).toBeNull();
    expect(computeDayEnergyRange([{ calories: 0 }, { calories: null }])).toBeNull();
  });

  it('widens the range with estimated entries and reports their share', () => {
    const range = computeDayEnergyRange([
      { calories: 500, parse_meta: { uncertainty_pct: 5 } },
      { calories: 500, parse_meta: { uncertainty_pct: 25 } },
    ]);
    expect(range).toEqual({ total: 1000, min: 850, max: 1150, estimatedSharePct: 50 });
  });

  it('falls back to the trust level for entries written before uncertainty was stored', () => {
    expect(computeDayEnergyRange([{ calories: 400, parse_meta: { trust_level: 'estimated' } }])).toEqual({
      total: 400, min: 300, max: 500, estimatedSharePct: 100,
    });
    expect(computeDayEnergyRange([{ calories: 400 }])?.max).toBe(460);
  });
});
