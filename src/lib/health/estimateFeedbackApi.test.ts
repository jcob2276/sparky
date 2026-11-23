import { describe, expect, it } from 'vitest';
import { entryChanged, isEstimatedEntry } from './estimateFeedbackApi';

const before = { amount: '165 g', calories: 380, protein: 32, carbs: 15, fat: 23 };

describe('estimate feedback', () => {
  it('liczy tylko wpisy z oszacowania AI', () => {
    expect(isEstimatedEntry({ macroSource: 'llm_estimate' })).toBe(true);
    expect(isEstimatedEntry({ input_mode: 'photo', macroSource: 'library' })).toBe(true);
    expect(isEstimatedEntry({ macroSource: 'library', input_mode: 'text' })).toBe(false);
    expect(isEstimatedEntry(null)).toBe(false);
  });

  it('wykrywa realną zmianę porcji albo makr, a drobny szum pomija', () => {
    expect(entryChanged(before, { ...before })).toBe(false);
    expect(entryChanged(before, { ...before, calories: 380.4, fat: 23.2 })).toBe(false);
    expect(entryChanged(before, { ...before, amount: '200 g' })).toBe(true);
    expect(entryChanged(before, { ...before, calories: 450 })).toBe(true);
    expect(entryChanged(before, { ...before, fat: 30 })).toBe(true);
  });
});
