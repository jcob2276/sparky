import { describe, expect, it } from 'vitest';
import { computeDayNutrientCoverage } from './nutrientCoverage';

describe('computeDayNutrientCoverage', () => {
  it('liczy sumę tylko ze znanych wartości i zlicza pokrycie', () => {
    const result = computeDayNutrientCoverage([
      { fiber: 2.4, saturated_fat: 3 },
      { fiber: 0, saturated_fat: null },
      { fiber: null, saturated_fat: null },
    ]);
    expect(result.fiber).toEqual({ total: 2.4, known: 2, items: 3 });
    expect(result.saturatedFat).toEqual({ total: 3, known: 1, items: 3 });
  });

  it('pusty dzień daje zera', () => {
    expect(computeDayNutrientCoverage([]).fiber).toEqual({ total: 0, known: 0, items: 0 });
  });
});
