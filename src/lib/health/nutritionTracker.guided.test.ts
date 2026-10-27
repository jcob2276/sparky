import { describe, expect, it } from 'vitest';
import { applyGuidedAnswer, type MealDraftItem } from './nutritionTracker';

const item: MealDraftItem = {
  id: 'i1', name: 'Pierogi', grams: 200, calories: 400, protein: 16, carbs: 60, fat: 10,
  saturatedFat: 4, salt: 1.2, confidence: 'medium', source: 'llm',
};
const question = { id: 'q', itemId: 'i1', prompt: 'Ile?', impactKcal: 100, options: [] };

describe('applyGuidedAnswer scales saturated fat and salt with the portion', () => {
  it('doubling the portion doubles both instead of keeping the old values', () => {
    const [result] = applyGuidedAnswer([item], question, { id: 'big', label: '400 g', grams: 400 });
    expect(result.grams).toBe(400);
    expect(result.saturatedFat).toBe(8);
    expect(result.salt).toBe(2.4);
  });

  it('leaves unknown salt unknown', () => {
    const [result] = applyGuidedAnswer([{ ...item, salt: undefined }], question, { id: 'big', label: '400 g', grams: 400 });
    expect(result.salt).toBeUndefined();
  });
});
