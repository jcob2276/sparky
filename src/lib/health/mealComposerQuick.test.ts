import { describe, expect, it } from 'vitest';
import { buildQuickChips } from './mealComposerQuick';

describe('buildQuickChips', () => {
  it('dedupes products by normalized name', () => {
    const chips = buildQuickChips({
      todayMeals: [],
      recentProducts: [{
        id: '1',
        name: 'Kawa domowa',
        brand: null,
        grams: 400,
        calories: 204,
        protein: 10,
        carbs: 8,
        fat: 6,
        fiber: null,
        sugar: null,
        loggedAt: null,
      }],
      favorites: [{
        id: 'fixed-kawa',
        name: 'Kawa domowa',
        brand: 'espresso',
        calories: 51,
        protein: 2.6,
        carbs: 4,
        fat: 2.7,
        fiber: 0,
        sugar: 4,
        default_grams: 400,
      }],
    });

    expect(chips).toHaveLength(1);
    expect(chips[0]?.kind).toBe('recent');
  });

  it('excludes items specified in excludeNames', () => {
    const chips = buildQuickChips({
      excludeNames: ['Kawa domowa', 'Kotlet schabowy'],
      recentProducts: [
        {
          id: '1',
          name: 'Kawa domowa',
          brand: null,
          grams: 400,
          calories: 204,
          protein: 10,
          carbs: 8,
          fat: 6,
          fiber: null,
          sugar: null,
          loggedAt: null,
        },
        {
          id: '2',
          name: 'Twaróg chudy',
          brand: null,
          grams: 200,
          calories: 170,
          protein: 36,
          carbs: 7,
          fat: 0.8,
          fiber: null,
          sugar: null,
          loggedAt: null,
        },
      ],
      favorites: [],
    });

    expect(chips).toHaveLength(1);
    expect(chips[0]?.name).toBe('Twaróg chudy');
  });
});
