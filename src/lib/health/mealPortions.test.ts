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
});
