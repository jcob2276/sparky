import { beforeEach, describe, expect, it, vi } from 'vitest';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('./nutritionTrackerApi', () => ({ confirmMealCapture: confirm }));
vi.mock('../supabase', () => ({ supabase: {}, invokeEdge: vi.fn() }));
vi.mock('./nutritionSideEffects', () => ({ scheduleNutritionRefresh: vi.fn() }));

import { copyFoodEntriesToDate, type TodayFoodEntry } from './composerTodayMealsApi';
import { saveParsedFoodItems, type ParsedFoodItem } from './foodLogging';

const entry = (id: string, mealType: string): TodayFoodEntry => ({
  id, name: id, brand: null, calories: 100, protein: 5, carbs: 10, fat: 2, fiber: null, sugar: null,
  amount: '100 g', meal_type: mealType, date: '2026-10-28',
});
const ids = () => confirm.mock.calls.map((call) => (call[0] as { captureId: string }).captureId);

describe('capture retry keeps operation ids', () => {
  beforeEach(() => confirm.mockReset());

  it('re-sends the saved breakfast with the same id after a failed lunch, then mints new ids for a new copy', async () => {
    const entries = [entry('sniadanie', 'breakfast'), entry('obiad', 'lunch')];
    confirm.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network'));
    await expect(copyFoodEntriesToDate('u1', entries, '2026-10-29')).rejects.toThrow('network');
    const [breakfastId, lunchId] = ids();

    confirm.mockClear();
    confirm.mockResolvedValue(undefined);
    await copyFoodEntriesToDate('u1', entries, '2026-10-29');
    expect(ids()).toEqual([breakfastId, lunchId]);

    confirm.mockClear();
    await copyFoodEntriesToDate('u1', entries, '2026-10-29');
    expect(ids().every((id) => id !== breakfastId && id !== lunchId)).toBe(true);
  });

  it('text capture retried after a failure reuses its id until it succeeds', async () => {
    const items = [{ name: 'Jajka', grams: 120, calories: 170, protein: 14, carbs: 1, fat: 12, confidence: 'high' }] as unknown as ParsedFoodItem[];
    confirm.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(undefined);
    await expect(saveParsedFoodItems('u1', items, { date: '2026-10-29', mealType: 'breakfast' })).rejects.toThrow('timeout');
    await saveParsedFoodItems('u1', items, { date: '2026-10-29', mealType: 'breakfast' });
    const [first, second] = ids();
    expect(second).toBe(first);
    await saveParsedFoodItems('u1', items, { date: '2026-10-29', mealType: 'breakfast' });
    expect(ids()[2]).not.toBe(first);
  });
});
