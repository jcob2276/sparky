import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { normalizeMealPhotoResponse } from './mealPhoto.ts';

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

Deno.test('meal photo normalization prioritizes the largest calorie uncertainty', () => {
  const draft = normalizeMealPhotoResponse(rawVisionFixture);

  assertEquals(draft.items.map((item) => item.name), [
    'Pierś z kurczaka', 'Ryż basmati', 'Warzywa z oliwą',
  ]);
  assertEquals(draft.questions.map((question) => question.id), [
    'hidden-oil', 'rice-portion', 'chicken-preparation',
  ]);
  assertEquals(draft.items[2].confidence, 'low');
  assertEquals(draft.questions[0].options[0].fat, 13);
  assertEquals(draft.parserVersion, 'meal-photo-v1');
});

Deno.test('meal photo normalization derives a conservative calorie range', () => {
  const draft = normalizeMealPhotoResponse(rawVisionFixture);

  assertEquals(draft.estimate.calories, 640);
  assertEquals(draft.estimate.minKcal < draft.estimate.calories, true);
  assertEquals(draft.estimate.maxKcal > draft.estimate.calories, true);
});

Deno.test('meal photo normalization rejects an empty model response', () => {
  assertThrows(() => normalizeMealPhotoResponse({ items: [] }), Error, 'no food items');
});
