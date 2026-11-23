import { describe, expect, it } from 'vitest';
import { resolveFixedMacros, weeklyFixedMacros } from './fixedMacros';

describe('resolveFixedMacros', () => {
  it('liczy węglowodany jako resztę energii', () => {
    expect(resolveFixedMacros({ fixed_kcal: 2250, fixed_protein_g: 170, fixed_fat_g: 50 }))
      .toEqual({ kcal: 2250, protein: 170, fat: 50, carbs: 280 });
  });

  it('zwraca null, gdy brakuje wartości albo makro przekraczają energię', () => {
    expect(resolveFixedMacros({ fixed_kcal: 2250, fixed_protein_g: 170 })).toBeNull();
    expect(resolveFixedMacros({ fixed_kcal: 1000, fixed_protein_g: 170, fixed_fat_g: 50 })).toBeNull();
    expect(resolveFixedMacros(null)).toBeNull();
  });

  it('cel tygodniowy to siedem dni', () => {
    expect(weeklyFixedMacros({ kcal: 2250, protein: 170, fat: 50, carbs: 280 }))
      .toEqual({ kcal: 15750, protein: 1190, fat: 350, carbs: 1960 });
  });
});
