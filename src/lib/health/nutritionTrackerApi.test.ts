import { describe, expect, it } from 'vitest';
import { buildCaptureItems } from './nutritionTrackerApi';

describe('buildCaptureItems', () => {
  it('converts whole-portion macros to the add_food_entry per-100g contract', () => {
    const [item] = buildCaptureItems([{
      id: 'rice', name: 'Ryż', grams: 200, calories: 260,
      protein: 5.4, carbs: 56, fat: 0.6, confidence: 'medium', source: 'llm',
    }]);

    expect(item.per100).toEqual(expect.objectContaining({
      calories: 130, protein: 2.7, carbs: 28, fat: 0.3,
    }));
    expect(item.parseMeta).toEqual(expect.objectContaining({
      user_confirmed: true, trust_level: 'estimated',
    }));
    expect(item.requestId).toEqual(expect.any(String));
  });
});
