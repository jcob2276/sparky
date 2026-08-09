import { describe, expect, it } from 'vitest';
import { normalizeMealPhotoResponse } from '../../../supabase/functions/_shared/foodParse/mealPhoto';

const rawVisionFixture = {
  items: [
    {
      id: 'chicken', name: 'Pierś z kurczaka', grams: 180, minGrams: 150, maxGrams: 220,
      calories: 297, protein: 55, carbs: 0, fat: 6, confidence: 'high',
      questions: [{ id: 'chicken-preparation', prompt: 'Jak przygotowany?', impactKcal: 90, options: [] }],
    },
    {
      id: 'rice', name: 'Ryż basmati', grams: 190, minGrams: 140, maxGrams: 250,
      calories: 247, protein: 5, carbs: 53, fat: 1, confidence: 'medium',
      questions: [{ id: 'rice-portion', prompt: 'Ile ryżu?', impactKcal: 130, options: [] }],
    },
    {
      id: 'vegetables', name: 'Warzywa z oliwą', grams: 200, minGrams: 180, maxGrams: 230,
      calories: 96, protein: 4, carbs: 14, fat: 3, confidence: 'low',
      questions: [{ id: 'hidden-oil', prompt: 'Ile oliwy?', impactKcal: 180, options: [
        { id: 'tbsp', label: 'Łyżka', grams: 210, calories: 186, protein: 4, carbs: 14, fat: 13 },
      ] }],
    },
  ],
};

describe('meal photo normalization', () => {
  it('prioritizes questions by calorie uncertainty and limits them to three', () => {
    const draft = normalizeMealPhotoResponse(rawVisionFixture);

    expect(draft.questions.map((question) => question.id)).toEqual([
      'hidden-oil', 'rice-portion', 'chicken-preparation',
    ]);
    expect(draft.items[2].confidence).toBe('low');
    expect(draft.questions[0].options[0]).toEqual(expect.objectContaining({
      id: 'tbsp', calories: 186, protein: 4, carbs: 14, fat: 13,
    }));
    expect(draft.questions[0].options.at(-1)).toEqual({ id: 'unknown', label: 'Nie wiem' });
  });

  it('derives a range around the estimated total', () => {
    const draft = normalizeMealPhotoResponse(rawVisionFixture);

    expect(draft.estimate.calories).toBe(640);
    expect(draft.estimate.minKcal).toBeLessThan(640);
    expect(draft.estimate.maxKcal).toBeGreaterThan(640);
  });

  it('rejects an empty response instead of inventing a meal', () => {
    expect(() => normalizeMealPhotoResponse({ items: [] })).toThrow('no food items');
  });
});
