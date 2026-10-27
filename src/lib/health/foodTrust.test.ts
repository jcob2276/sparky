import { describe, expect, it } from 'vitest';
import { calorieRange, deriveFoodTrust, deriveItemUncertainty, isMacroSource } from './foodTrust';

describe('food trust', () => {
  it('does not pretend an incomplete product is usable', () => {
    expect(deriveFoodTrust({ source: 'off', calories: null }).level).toBe('incomplete');
  });

  it('distinguishes confirmed labels from estimates', () => {
    expect(deriveFoodTrust({ source: 'label_ocr', calories: 200 }).uncertaintyPct).toBe(5);
    expect(deriveFoodTrust({ source: 'estimated', calories: 200 }).uncertaintyPct).toBe(25);
  });

  it('builds a visible uncertainty range', () => {
    expect(calorieRange(200, 10)).toEqual({ min: 180, max: 220 });
  });
});

describe('item uncertainty', () => {
  it('does not give an LLM photo estimate the 8% of a confirmed product, even when the model says "high"', () => {
    const photoPierogi = deriveItemUncertainty({
      macroSource: 'llm_estimate', itemSource: 'llm', confidence: 'high', explicitGrams: false, inputMode: 'photo',
    });
    expect(photoPierogi).toBe(25);
  });

  it('keeps user corrections and explicit grams tight', () => {
    expect(deriveItemUncertainty({ macroSource: 'user_correction', explicitGrams: true, confidence: 'high' })).toBe(3);
    expect(deriveItemUncertainty({ macroSource: 'library', explicitGrams: true, confidence: 'high' })).toBe(5);
  });

  it('is wider for a photo portion than for typed text with the same macros', () => {
    const base = { macroSource: 'off', confidence: 'high', explicitGrams: false } as const;
    expect(deriveItemUncertainty({ ...base, inputMode: 'photo' })).toBeGreaterThan(deriveItemUncertainty({ ...base, inputMode: 'text' }));
  });

  it('never lets a copy be more certain than the original', () => {
    const copied = deriveItemUncertainty({
      macroSource: 'llm_estimate', confidence: 'high', explicitGrams: true, priorUncertaintyPct: 30,
    });
    expect(copied).toBe(30);
  });

  it('stays inside sane bounds', () => {
    expect(deriveItemUncertainty({ macroSource: 'llm_estimate', confidence: 'low', inputMode: 'photo' })).toBeLessThanOrEqual(50);
    expect(deriveItemUncertainty({ macroSource: 'user_correction', explicitGrams: true, priorUncertaintyPct: 0 })).toBeGreaterThanOrEqual(3);
  });

  it('validates macro sources read back from stored metadata', () => {
    expect(isMacroSource('llm_estimate')).toBe(true);
    expect(isMacroSource('confirmed')).toBe(false);
    expect(isMacroSource(undefined)).toBe(false);
  });
});
