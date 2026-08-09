import { beforeEach, describe, expect, it, vi } from 'vitest';

const { confirmMealCapture } = vi.hoisted(() => ({ confirmMealCapture: vi.fn() }));
vi.mock('./nutritionTrackerApi', () => ({ confirmMealCapture }));

import { saveParsedFoodItems } from './foodLogging';

describe('saveParsedFoodItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMealCapture.mockResolvedValue(undefined);
  });

  it('routes confirmed text through adaptive meal memory', async () => {
    await saveParsedFoodItems('user-1', [{
      name: 'Owsianka', grams: 350, calories: 480, protein: 28, carbs: 65, fat: 13,
      confidence: 'medium', source: 'llm',
    }], { date: '2026-08-09', mealType: 'breakfast' });

    expect(confirmMealCapture).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', source: 'text', mealType: 'breakfast',
      items: [expect.objectContaining({ id: 'text-1', name: 'Owsianka' })],
    }));
  });
});
