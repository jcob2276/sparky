import { describe, expect, it } from 'vitest';
import {
  applyGuidedAnswer,
  buildMealFingerprint,
  buildNutritionProjection,
  mealMemoryCalories,
  rankMealMemoriesForGap,
  mealMemoryToDraft,
  isCalibrationEligible,
  selectGuidedQuestions,
  type MealDraftItem,
} from './nutritionTracker';

function draftItem(
  id: string,
  name: string,
  questionCandidates: MealDraftItem['questionCandidates'] = [],
): MealDraftItem {
  return {
    id,
    name,
    grams: 100,
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 2,
    confidence: 'medium',
    source: 'llm',
    questionCandidates,
  };
}

describe('nutrition tracker domain', () => {
  it('asks at most three questions in descending calorie impact', () => {
    const items = [
      draftItem('vegetables', 'Warzywa', [
        { id: 'hidden-oil', prompt: 'Ile oliwy?', impactKcal: 180, options: [] },
      ]),
      draftItem('rice', 'Ryż basmati', [
        { id: 'rice-portion', prompt: 'Ile ryżu?', impactKcal: 130, options: [] },
      ]),
      draftItem('chicken', 'Kurczak', [
        { id: 'chicken-preparation', prompt: 'Jak przygotowany?', impactKcal: 90, options: [] },
        { id: 'seasoning', prompt: 'Jakie przyprawy?', impactKcal: 5, options: [] },
      ]),
    ];

    expect(selectGuidedQuestions(items, 3).map((question) => question.id)).toEqual([
      'hidden-oil',
      'rice-portion',
      'chicken-preparation',
    ]);
  });

  it('builds a stable fingerprint independent of item order and Polish accents', () => {
    const items = [
      draftItem('v', 'Warzywa'),
      draftItem('c', 'Kurczak'),
      draftItem('r', 'Ryż basmati'),
    ];

    expect(buildMealFingerprint(items)).toBe('kurczak|ryz-basmati|warzywa');
    expect(buildMealFingerprint([...items].reverse())).toBe('kurczak|ryz-basmati|warzywa');
  });

  it('allows only explicitly complete days into calibration', () => {
    expect(isCalibrationEligible('complete')).toBe(true);
    expect(isCalibrationEligible('partial')).toBe(false);
    expect(isCalibrationEligible('unknown')).toBe(false);
    expect(isCalibrationEligible(null)).toBe(false);
  });

  it('rescales the selected item when a portion answer changes grams', () => {
    const items = [draftItem('rice', 'Ryż')];
    const result = applyGuidedAnswer(items, {
      id: 'portion', itemId: 'rice', prompt: 'Ile ryżu?', impactKcal: 120, options: [],
    }, { id: 'large', label: 'Dużo', grams: 150 });

    expect(result[0]).toEqual(expect.objectContaining({
      grams: 150, calories: 150, protein: 15, carbs: 15, fat: 3,
    }));
  });

  it('leaves the estimate unchanged for the unknown answer', () => {
    const items = [draftItem('rice', 'Ryż')];
    const result = applyGuidedAnswer(items, {
      id: 'portion', itemId: 'rice', prompt: 'Ile ryżu?', impactKcal: 120, options: [],
    }, { id: 'unknown', label: 'Nie wiem' });

    expect(result).toEqual(items);
  });

  it('keeps macros coherent when a guided answer changes calories only', () => {
    const items = [draftItem('meal', 'Posiłek')];
    const [result] = applyGuidedAnswer(items, {
      id: 'preparation', itemId: 'meal', prompt: 'Jak przygotowany?', impactKcal: 100, options: [],
    }, { id: 'fried', label: 'Smażony', calories: 150 });

    expect(result).toEqual(expect.objectContaining({
      calories: 150, protein: 15, carbs: 15, fat: 3,
    }));
  });

  it('uses exact whole-portion macros supplied by a guided answer', () => {
    const items = [draftItem('meal', 'Posiłek')];
    const [result] = applyGuidedAnswer(items, {
      id: 'preparation', itemId: 'meal', prompt: 'Jak przygotowany?', impactKcal: 100, options: [],
    }, {
      id: 'fried', label: 'Smażony', grams: 120, calories: 190,
      protein: 12, carbs: 14, fat: 9,
    });

    expect(result).toEqual(expect.objectContaining({
      grams: 120, calories: 190, protein: 12, carbs: 14, fat: 9,
    }));
  });

  it('projects the next remembered meal without presenting it as logged', () => {
    const remembered = mealMemoryCalories([
      { grams: 200, per100: { calories: 130 } },
      { grams: 150, per100: { calories: 120 } },
    ]);
    expect(remembered).toBe(440);
    expect(buildNutritionProjection(900, 2000, remembered)).toEqual({
      current: 900, nextMeal: 440, projected: 1340, remainingAfter: 660,
    });
  });

  it('restores a remembered meal into editable whole-portion items', () => {
    const items = mealMemoryToDraft([{ name: 'Ryż', grams: 200, per100: {
      calories: 130, protein: 2.7, carbs: 28, fat: 0.3,
    } }]);
    expect(items[0]).toEqual(expect.objectContaining({
      name: 'Ryż', grams: 200, calories: 260, protein: 5.4, carbs: 56, fat: 0.6,
      source: 'library', confidence: 'high',
    }));
  });

  it('recommends a confirmed personal meal that closes calories and protein together', () => {
    const memory = (id: string, name: string, calories: number, protein: number, confirmedCount: number) => ({
      id, name, meal_type: 'dinner', confirmed_count: confirmedCount,
      items: [{ name, grams: 100, per100: { calories, protein, carbs: 20, fat: 10 } }],
    });
    const suggestions = rankMealMemoriesForGap([
      memory('cake', 'Ciasto', 610, 5, 12),
      memory('chicken', 'Kurczak z ryżem', 620, 45, 3),
      memory('snack', 'Mała przekąska', 180, 12, 20),
    ], { remainingCalories: 650, remainingProtein: 40, mealType: 'dinner' });

    expect(suggestions[0]).toEqual(expect.objectContaining({
      id: 'chicken', name: 'Kurczak z ryżem', calories: 620, protein: 45,
    }));
    expect(suggestions[0].reason).toContain('białk');
  });
});
