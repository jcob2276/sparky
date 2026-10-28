import { describe, expect, it } from 'vitest';
import { FDC_NUTRIENT, mapFdcFood, type FdcFoodInput } from '@vanguard/domain';

const food = (nutrients: Array<[number, number]>, overrides: Partial<FdcFoodInput> = {}): FdcFoodInput => ({
  fdcId: 1,
  dataType: 'sr_legacy_food',
  description: ' Bananas, raw ',
  category: 'Fruits',
  publicationDate: null,
  nutrients: new Map(nutrients),
  portions: [],
  ...overrides,
});

describe('mapFdcFood', () => {
  it('bierze zmierzoną energię i liczy węglowodany przyswajalne jako różnicę minus błonnik', () => {
    const row = mapFdcFood(food([
      [FDC_NUTRIENT.energyKcal, 89], [FDC_NUTRIENT.protein, 1.09], [FDC_NUTRIENT.fat, 0.33],
      [FDC_NUTRIENT.carbsByDifference, 22.84], [FDC_NUTRIENT.fiber, 2.6], [FDC_NUTRIENT.sodiumMg, 1],
    ]));
    expect(row).toMatchObject({ description: 'Bananas, raw', kcal: 89, energySource: 'measured', carbs: 20.24, carbsByDifference: 22.84, fiber: 2.6 });
    expect(row?.salt).toBe(0.003); // 1 mg sodu × 2,5 = 2,5 mg soli
  });

  it('Foundation bez 1008: energia z Atwater specific, potem general, na końcu 4/4/9', () => {
    const base: Array<[number, number]> = [[FDC_NUTRIENT.protein, 10], [FDC_NUTRIENT.fat, 5], [FDC_NUTRIENT.carbsByDifference, 20]];
    expect(mapFdcFood(food([...base, [FDC_NUTRIENT.energyAtwaterSpecific, 170], [FDC_NUTRIENT.energyAtwaterGeneral, 165]]))).toMatchObject({ kcal: 170, energySource: 'atwater_specific' });
    expect(mapFdcFood(food([...base, [FDC_NUTRIENT.energyAtwaterGeneral, 165]]))).toMatchObject({ kcal: 165, energySource: 'atwater_general' });
    expect(mapFdcFood(food(base))).toMatchObject({ kcal: 165, energySource: 'computed_4_4_9' }); // 40 + 80 + 45
  });

  it('używa zastępczych numerów: tłuszcz NLEA, węglowodany z sumowania, cukry NLEA', () => {
    const row = mapFdcFood(food([
      [FDC_NUTRIENT.energyKcal, 100], [FDC_NUTRIENT.protein, 1], [FDC_NUTRIENT.fatNlea, 2],
      [FDC_NUTRIENT.carbsBySummation, 15], [FDC_NUTRIENT.sugarsNlea, 6],
    ]));
    expect(row).toMatchObject({ fat: 2, carbs: 15, sugar: 6, fiber: null, salt: null });
  });

  it('braki zostają null, a rekord bez makroskładników jest odrzucany', () => {
    const row = mapFdcFood(food([[FDC_NUTRIENT.energyKcal, 50], [FDC_NUTRIENT.protein, 1], [FDC_NUTRIENT.fat, 0], [FDC_NUTRIENT.carbsByDifference, 10]]));
    expect(row).toMatchObject({ fiber: null, sugar: null, saturatedFat: null, salt: null, carbs: 10 });
    expect(mapFdcFood(food([[FDC_NUTRIENT.energyKcal, 884], [FDC_NUTRIENT.fat, 100]]))).toBeNull(); // brak białka i węglowodanów
  });

  it('błonnik większy niż różnica nie daje ujemnych węglowodanów', () => {
    const row = mapFdcFood(food([[FDC_NUTRIENT.protein, 5], [FDC_NUTRIENT.fat, 1], [FDC_NUTRIENT.carbsByDifference, 3], [FDC_NUTRIENT.fiber, 4]]));
    expect(row?.carbs).toBe(0);
  });
});
