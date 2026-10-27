import { describe, expect, it } from 'vitest';
import { mergeMicronutrients } from '@vanguard/domain';

const caps = { fatG: 20, grams: 150 };

describe('mergeMicronutrients', () => {
  it('prefers source data and marks the rest as model estimates instead of dropping it', () => {
    const { values, sources } = mergeMicronutrients(
      { fiber: 2.4 },
      { fiber: 5, sugar: 3, saturatedFat: 6, salt: 1.5 },
      caps,
    );
    expect(values).toEqual({ fiber: 2.4, sugar: 3, saturatedFat: 6, salt: 1.5 });
    expect(sources).toEqual({ fiber: 'data', sugar: 'estimate', saturated_fat: 'estimate', salt: 'estimate' });
  });

  it('keeps unknown unknown: no field means no value and no source', () => {
    expect(mergeMicronutrients({}, {}, caps)).toEqual({ values: {}, sources: {} });
    expect(mergeMicronutrients({ salt: null }, { salt: null }, caps).values).toEqual({});
  });

  it('treats a stored zero as real data, not as missing', () => {
    const { values, sources } = mergeMicronutrients({ saturatedFat: 0 }, { saturatedFat: 4 }, caps);
    expect(values.saturatedFat).toBe(0);
    expect(sources.saturated_fat).toBe('data');
  });

  it('caps physically impossible estimates', () => {
    const { values } = mergeMicronutrients({}, { saturatedFat: 30, salt: 400, fiber: -2 }, caps);
    expect(values.saturatedFat).toBe(20);
    expect(values.salt).toBe(150);
    expect(values.fiber).toBe(0);
  });

  it('rounds salt to 0.01 g and the rest to 0.1 g', () => {
    const { values } = mergeMicronutrients({}, { salt: 0.126, sugar: 2.26 }, caps);
    expect(values.salt).toBe(0.13);
    expect(values.sugar).toBe(2.3);
  });
});

import { applyMicronutrientEstimates, indexesMissingMicronutrients, type EstimableItem } from '@vanguard/domain';

const item = (over: Partial<EstimableItem> = {}): EstimableItem => ({
  grams: 100, fat: 10, parseMeta: { micronutrientSources: {} }, ...over,
});

describe('applyMicronutrientEstimates', () => {
  it('fills only the empty fields and marks them as estimates', () => {
    const [filled] = applyMicronutrientEstimates(
      [item({ fiber: 2 })],
      { items: [{ index: 0, fiber: 9, sugar: 1, saturatedFat: 4, salt: 1.3 }] },
    );
    expect(filled).toEqual(expect.objectContaining({ fiber: 2, sugar: 1, saturatedFat: 4, salt: 1.3 }));
    expect(filled.parseMeta?.micronutrientSources).toEqual(expect.objectContaining({ sugar: 'estimate', saturated_fat: 'estimate', salt: 'estimate' }));
  });

  it('keeps the recorded origin of values that were already there', () => {
    const [filled] = applyMicronutrientEstimates(
      [item({ fiber: 2, sugar: 3, parseMeta: { micronutrientSources: { fiber: 'data', sugar: 'estimate' } } })],
      { items: [{ index: 0, saturatedFat: 4, salt: 1 }] },
    );
    expect(filled.parseMeta?.micronutrientSources).toEqual({ fiber: 'data', sugar: 'estimate', saturated_fat: 'estimate', salt: 'estimate' });
  });

  it('treats unrecorded values of a model-calculated item as estimates, not data', () => {
    const [filled] = applyMicronutrientEstimates(
      [item({ fiber: 1, parseMeta: { macroSource: 'llm_estimate', micronutrientSources: {} } })],
      { items: [{ index: 0, salt: 0.8 }] },
    );
    expect(filled.parseMeta?.micronutrientSources).toEqual({ fiber: 'estimate', salt: 'estimate' });
    const [fromLibrary] = applyMicronutrientEstimates(
      [item({ fiber: 1, parseMeta: { macroSource: 'library', micronutrientSources: {} } })],
      { items: [{ index: 0, salt: 0.8 }] },
    );
    expect(fromLibrary.parseMeta?.micronutrientSources).toEqual({ fiber: 'data', salt: 'estimate' });
  });

  it('ignores garbage: wrong shape, bad indexes, non-numbers, null estimates', () => {
    const items = [item()];
    expect(applyMicronutrientEstimates(items, null)).toEqual(items);
    expect(applyMicronutrientEstimates(items, { items: [{ index: 5, salt: 1 }, { index: 'x' }, 'zły', { index: 0, salt: 'dużo', fiber: null }] })[0].salt).toBeUndefined();
  });

  it('caps an impossible estimate instead of storing it', () => {
    const [capped] = applyMicronutrientEstimates([item({ fat: 5 })], { items: [{ index: 0, saturatedFat: 40, salt: 900 }] });
    expect(capped.saturatedFat).toBe(5);
    expect(capped.salt).toBe(100);
  });

  it('lists the items that still miss a nutrient', () => {
    expect(indexesMissingMicronutrients([item({ fiber: 1, sugar: 1, saturatedFat: 1, salt: 1 }), item({ fiber: 1 }), item()])).toEqual([1, 2]);
  });
});
