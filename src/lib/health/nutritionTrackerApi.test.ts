import { describe, expect, it } from 'vitest';
import { buildCaptureItems } from './nutritionTrackerApi';

const base = { id: 'x', name: 'Pierogi z serem', grams: 350, calories: 756, protein: 31.5, carbs: 98, fat: 24 };

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

  it('marks Open Food Facts and reference data as reference, not confirmed', () => {
    const [off, ref] = buildCaptureItems(['off', 'reference_pl'].map((macroSource) => ({
      ...base, confidence: 'high' as const, source: 'database' as const,
      parseMeta: { macroSource: macroSource as 'off' | 'reference_pl', parserVersion: 't', explicitGrams: true },
    })));
    expect(off.parseMeta.trust_level).toBe('reference');
    expect(ref.parseMeta.trust_level).toBe('reference');
  });

  it('keeps a copied LLM estimate an estimate even though it comes from the library path', () => {
    const [item] = buildCaptureItems([{
      ...base, confidence: 'medium', source: 'library',
      parseMeta: { macroSource: 'llm_estimate', parserVersion: 'repeat-v2', priorUncertaintyPct: 25 },
    }], 'repeat');
    expect(item.parseMeta.trust_level).toBe('estimated');
    expect(item.parseMeta.uncertainty_pct).toBeGreaterThanOrEqual(25);
  });

  it('gives a photo estimate a realistic range instead of 8%', () => {
    const [item] = buildCaptureItems([{
      ...base, confidence: 'high', source: 'llm',
      parseMeta: { macroSource: 'llm_estimate', parserVersion: 'meal-photo-v1', explicitGrams: false },
    }], 'photo');
    expect(item.parseMeta.uncertainty_pct).toBeGreaterThanOrEqual(20);
  });

  it('sends salt per 100 g and keeps unknown salt as null', () => {
    const [withSalt, without] = buildCaptureItems([
      { ...base, confidence: 'high', source: 'library', salt: 3.5, saturatedFat: 10, parseMeta: { macroSource: 'library', parserVersion: 't' } },
      { ...base, confidence: 'high', source: 'library' },
    ]);
    expect(withSalt.per100).toEqual(expect.objectContaining({ salt: 1, saturated_fat: 2.9 }));
    expect(without.per100.salt).toBeNull();
  });
});
