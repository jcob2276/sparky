import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoodEntryEdit } from './useFoodEntryEdit';
import { updateFoodEntry } from '../../../../lib/health/foodLogging';
import type { RecentEntry } from './foodEntryUtils';
vi.mock('../../../../lib/health/foodLogging', async (original) => ({
  ...await original<typeof import('../../../../lib/health/foodLogging')>(),
  updateFoodEntry: vi.fn().mockResolvedValue(undefined),
  saveFoodCorrection: vi.fn().mockResolvedValue(undefined),
}));
const entry: RecentEntry = { id: 'x', name: 'Jajka', brand: null, calories: 210, protein: 18, carbs: 1, fat: 15, amount: '3 szt.', date: '2026-10-27' };
function setup(amount: string | null = '3 szt.') {
  return renderHook(() => useFoodEntryEdit({ userId: 'u', initialEditEntry: { ...entry, amount }, setError: vi.fn(), loadLists: vi.fn().mockResolvedValue(undefined) }));
}
describe('editing an entry with no recorded mass', () => {
  beforeEach(() => vi.clearAllMocks());
  it('starts with an empty weight and no calculated per-100g preview', () => {
    const { result } = setup();
    expect(result.current.editGrams).toBe('');
    expect(result.current.editPreview).toBeNull();
  });
  it('assigns the supplied weight to the whole recorded portion without multiplying its macros', async () => {
    const { result } = setup();
    act(() => result.current.setEditGrams('180'));
    expect(result.current.editPreview).toEqual({ calories: 210, protein: 18, carbs: 1, fat: 15 });
    await act(() => result.current.saveEntryEdit());
    expect(updateFoodEntry).toHaveBeenCalledWith('u', 'x', expect.objectContaining({ amount: '180 g', calories: 210, protein: 18 }));
  });
  it.each(['', '0', '-1', 'Infinity'])('does not save invalid weight %s', async (value) => {
    const { result } = setup('150 g');
    act(() => result.current.setEditGrams(value));
    await act(() => result.current.saveEntryEdit());
    expect(updateFoodEntry).not.toHaveBeenCalled();
  });
  it('still scales normally when the old mass is known', () => {
    const { result } = setup('150 g');
    act(() => result.current.setEditGrams('300'));
    expect(result.current.editPreview).toEqual({ calories: 420, protein: 36, carbs: 2, fat: 30 });
  });
});
