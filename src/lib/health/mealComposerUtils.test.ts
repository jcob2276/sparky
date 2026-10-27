import { describe, expect, it } from 'vitest';
import { entriesToDraft, foodBaseToDraft, type RepeatableFoodEntry } from './mealComposerUtils';

const entry = (parse_meta: unknown): RepeatableFoodEntry => ({
  id: 'e1', name: 'Pierogi z serem', brand: null, calories: 756, protein: 31.5, carbs: 98, fat: 24,
  fiber: 2.8, sugar: null, amount: '350 g', parse_meta,
});

describe('entriesToDraft', () => {
  it('does not turn a copied photo estimate into a confident library item', () => {
    const [item] = entriesToDraft([entry({ macroSource: 'llm_estimate', explicitGrams: false, uncertainty_pct: 25 })]);
    expect(item.confidence).toBe('low');
    expect(item.parseMeta).toEqual(expect.objectContaining({ macroSource: 'llm_estimate', priorUncertaintyPct: 25 }));
  });

  it('keeps high confidence for entries that were solid data', () => {
    const [item] = entriesToDraft([entry({ macroSource: 'library', uncertainty_pct: 5 })]);
    expect(item.confidence).toBe('high');
  });

  it('keeps legacy entries without metadata exactly as before', () => {
    const [item] = entriesToDraft([entry(null)]);
    expect(item.confidence).toBe('high');
    expect(item.parseMeta).toBeUndefined();
    expect(item.grams).toBe(350);
  });

  it('ignores unknown stored sources instead of trusting them', () => {
    const [item] = entriesToDraft([entry({ macroSource: 'whatever', uncertainty_pct: 'x' })]);
    expect(item.parseMeta).toBeUndefined();
  });
});

describe('entriesToDraft salt', () => {
  it('carries saved salt into a repeated draft and leaves unknown salt unknown', () => {
    const [known] = entriesToDraft([{ ...entry(null), salt: 2.4 }]);
    const [unknown] = entriesToDraft([{ ...entry(null), salt: null }]);
    expect(known.salt).toBe(2.4);
    expect(unknown.salt).toBeUndefined();
  });
});

describe('foodBaseToDraft', () => {
  const base = { barcode: null, brand: null, fiber: null, sugar: null };

  it('flags a search result whose kcal contradict its macros instead of logging it as high confidence', () => {
    const draft = foodBaseToDraft({ ...base, name: 'YoPRO Straciatella', calories: 100, protein: 8.3, carbs: 5.4, fat: 0.5, confidence: 'high' }, 270);
    expect(draft.confidence).toBe('low');
    expect(draft.parseMeta?.validationStatus).toBe('review');
    expect(draft.assumptions?.join(' ')).toContain('niespójna energia');
  });

  it('carries label salt as data and marks every provided nutrient as such', () => {
    const draft = foodBaseToDraft({ ...base, name: 'Chleb', calories: 250, protein: 8, carbs: 48, fat: 2, fiber: 6, salt: 1.2, confidence: 'high' }, 50);
    expect(draft.salt).toBe(0.6);
    expect(draft.parseMeta?.micronutrientSources).toEqual({ fiber: 'data', salt: 'data' });
  });

  it('keeps consistent products untouched', () => {
    const draft = foodBaseToDraft({ ...base, name: 'Banan', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, confidence: 'high' }, 120);
    expect(draft.confidence).toBe('high');
    expect(draft.assumptions).toBeUndefined();
  });
});
