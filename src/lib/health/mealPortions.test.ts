import { describe, expect, it } from 'vitest';
import {
  applyPortionState,
  buildPortionChips,
  draftTotals,
  inferPortionState,
  scaleDraftItem,
  switchPortionUnit,
} from './mealPortions';
import type { MealDraftItem } from './nutritionTracker';

const baseItem: MealDraftItem = {
  id: '1',
  name: 'Jajko',
  grams: 120,
  calories: 180,
  protein: 15,
  carbs: 1,
  fat: 12,
  confidence: 'high',
  source: 'library',
  parseMeta: { macroSource: 'reference_pl', parserVersion: 'test', quantity: 2, unit: 'piece' },
};

describe('mealPortions', () => {
  it('infers piece portions from parse meta', () => {
    expect(inferPortionState(baseItem)).toEqual({ unit: 'piece', quantity: 2, gramsPerUnit: 60 });
  });

  it('scales macros when grams change', () => {
    const scaled = scaleDraftItem(baseItem, 60);
    expect(scaled.grams).toBe(60);
    expect(scaled.calories).toBe(90);
    expect(scaled.protein).toBe(7.5);
  });

  it('applies portion quantity to grams', () => {
    const next = applyPortionState(baseItem, { unit: 'piece', quantity: 3, gramsPerUnit: 60 });
    expect(next.grams).toBe(180);
    expect(next.calories).toBe(270);
  });

  it('switches to glass with default grams per unit', () => {
    const state = switchPortionUnit(baseItem, 'glass');
    expect(state.unit).toBe('glass');
    expect(state.gramsPerUnit).toBe(200);
  });

  it('builds fraction and remembered chips', () => {
    const chips = buildPortionChips({
      ...baseItem,
      parseMeta: { ...baseItem.parseMeta!, defaultGrams: 170 },
    }, 150);
    const labels = chips.map((chip) => chip.label);
    expect(labels).toContain('Twoja 150g');
    expect(labels).toContain('Porcja 170g');
    expect(labels.some((label) => label.includes('½'))).toBe(true);
  });

  it('sums draft totals', () => {
    expect(draftTotals([baseItem, scaleDraftItem(baseItem, 60)])).toEqual({
      calories: 270,
      protein: 22.5,
      carbs: 1.5,
      fat: 18,
    });
  });

  it('safely scales to 0 and recovers base macros when scaled back up', () => {
    const zeroed = scaleDraftItem(baseItem, 0);
    expect(zeroed.grams).toBe(0);
    expect(zeroed.calories).toBe(0);
    expect(zeroed.protein).toBe(0);

    const restored = scaleDraftItem(zeroed, 120);
    expect(restored.grams).toBe(120);
    expect(restored.calories).toBe(180);
    expect(restored.protein).toBe(15);
  });
});

it('scales salt and saturated fat with the portion and restores their original baseline', () => {
  const item = { ...baseItem, saturatedFat: 4, salt: 1.3 };
  const half = scaleDraftItem(item, 60);
  expect(half.saturatedFat).toBe(2);
  expect(half.salt).toBe(0.65);
  const double = scaleDraftItem(half, 240);
  expect(double.saturatedFat).toBe(8);
  expect(double.salt).toBe(2.6);
  const restored = scaleDraftItem(scaleDraftItem(double, 0), 120);
  expect(restored.saturatedFat).toBe(4);
  expect(restored.salt).toBe(1.3);
});
