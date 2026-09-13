import { describe, expect, it, vi, beforeEach } from 'vitest';
import { copyFoodEntriesToDate, type TodayFoodEntry } from './composerTodayMealsApi';
import { confirmMealCapture } from './nutritionTrackerApi';

vi.mock('./nutritionTrackerApi', () => ({
  confirmMealCapture: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockEntries: TodayFoodEntry[] = [
  {
    id: 'entry-1',
    name: 'Jajka',
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
    fiber: null,
    sugar: null,
    brand: null,
    amount: '2 sztuki',
    meal_type: 'breakfast',
    date: '2026-09-12',
  },
  {
    id: 'entry-2',
    name: 'Chleb żytni',
    calories: 160,
    protein: 4,
    carbs: 32,
    fat: 1,
    fiber: null,
    sugar: null,
    brand: null,
    amount: '70g',
    meal_type: 'breakfast',
    date: '2026-09-12',
  },
  {
    id: 'entry-3',
    name: 'Pierś z kurczaka',
    calories: 220,
    protein: 44,
    carbs: 0,
    fat: 3,
    fiber: null,
    sugar: null,
    brand: null,
    amount: '200g',
    meal_type: 'lunch',
    date: '2026-09-12',
  },
];

describe('copyFoodEntriesToDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies all entries preserving their original meal types by default', async () => {
    await copyFoodEntriesToDate('user-1', mockEntries, '2026-09-13');

    expect(confirmMealCapture).toHaveBeenCalledTimes(2);
    expect(confirmMealCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        date: '2026-09-13',
        mealType: 'breakfast',
        source: 'repeat',
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Jajka' }),
          expect.objectContaining({ name: 'Chleb żytni' }),
        ]),
      })
    );
    expect(confirmMealCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        date: '2026-09-13',
        mealType: 'lunch',
        source: 'repeat',
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Pierś z kurczaka' }),
        ]),
      })
    );
  });

  it('copies only selected entries when selectedIds is specified', async () => {
    await copyFoodEntriesToDate('user-1', mockEntries, '2026-09-13', {
      selectedIds: new Set(['entry-1']),
    });

    expect(confirmMealCapture).toHaveBeenCalledTimes(1);
    expect(confirmMealCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        mealType: 'breakfast',
        items: [expect.objectContaining({ name: 'Jajka' })],
      })
    );
  });

  it('routes copied entries to targetMealType when specified', async () => {
    await copyFoodEntriesToDate('user-1', mockEntries, '2026-09-13', {
      targetMealType: 'dinner',
      selectedIds: new Set(['entry-3']),
    });

    expect(confirmMealCapture).toHaveBeenCalledTimes(1);
    expect(confirmMealCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        mealType: 'dinner',
        items: [expect.objectContaining({ name: 'Pierś z kurczaka' })],
      })
    );
  });

  it('supports legacy targetMealType string parameter', async () => {
    await copyFoodEntriesToDate('user-1', [mockEntries[0]], '2026-09-13', 'snack');

    expect(confirmMealCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        mealType: 'snack',
        items: [expect.objectContaining({ name: 'Jajka' })],
      })
    );
  });

  it('does nothing if entries array is empty or selectedIds excludes all', async () => {
    await copyFoodEntriesToDate('user-1', [], '2026-09-13');
    expect(confirmMealCapture).not.toHaveBeenCalled();

    await copyFoodEntriesToDate('user-1', mockEntries, '2026-09-13', {
      selectedIds: new Set(['non-existent']),
    });
    expect(confirmMealCapture).not.toHaveBeenCalled();
  });
});
