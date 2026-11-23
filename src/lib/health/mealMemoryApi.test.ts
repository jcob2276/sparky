import { describe, expect, it } from 'vitest';
import { toMemoryMeal } from './mealMemoryApi';

const item = { name: 'Banan', grams: 240, per100: { calories: 103, protein: 0.5, carbs: 24.6, fat: 0.3 } };

describe('toMemoryMeal', () => {
  it('mapuje zatwierdzony posiłek i nazywa kopie dni od składników', () => {
    expect(toMemoryMeal({ id: '1', name: 'Banan', meal_type: 'snack', confirmed_count: 13, items: [item] })).toEqual({
      id: '1', name: 'Banan', slot: 'snack', confirmedCount: 13,
      items: [{ name: 'Banan', grams: 240, per100: { kcal: 103, protein: 0.5, carbs: 24.6, fat: 0.3 } }],
    });
    expect(toMemoryMeal({ id: '2', name: 'Kopia z 2026-10-25', meal_type: 'breakfast', confirmed_count: 2, items: [item] })?.name).toBe('Banan');
  });

  it('pomija posiłki z brakującą gramaturą albo makrami i nieznaną porą dnia', () => {
    expect(toMemoryMeal({ id: '3', name: 'x', meal_type: 'snack', confirmed_count: 1, items: [{ ...item, per100: { calories: 103 } }] })).toBeNull();
    expect(toMemoryMeal({ id: '4', name: 'x', meal_type: 'brunch', confirmed_count: 1, items: [item] })).toBeNull();
  });
});
