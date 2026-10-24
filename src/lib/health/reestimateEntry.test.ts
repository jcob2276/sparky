import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMealPhotoBlob, analyzeMealPhoto, parseFoodNL } = vi.hoisted(() => ({
  fetchMealPhotoBlob: vi.fn(),
  analyzeMealPhoto: vi.fn(),
  parseFoodNL: vi.fn(),
}));

vi.mock('./mealPhotoStore', () => ({ fetchMealPhotoBlob }));
vi.mock('./mealPhotoScan', () => ({ analyzeMealPhoto }));
vi.mock('./foodLogging', () => ({ parseFoodNL }));

import { buildPhotoHint, per100FromItems, reestimateEntry } from './reestimateEntry';

const item = (grams: number, calories: number) => ({ grams, calories, protein: calories / 50, carbs: 10, fat: 5 });

describe('per100FromItems', () => {
  it('normalises the summed items to 100 g and rejects empty results', () => {
    expect(per100FromItems([item(200, 600)])?.calories).toBe(300);
    expect(per100FromItems([item(100, 100), item(100, 300)])?.calories).toBe(200);
    expect(per100FromItems([])).toBeNull();
    expect(per100FromItems([item(0, 100)])).toBeNull();
  });
});

describe('reestimateEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseFoodNL.mockResolvedValue([item(100, 358)]);
  });

  it('looks at the stored photo, with the corrected name as the hint', async () => {
    fetchMealPhotoBlob.mockResolvedValue(new Blob(['jpg']));
    analyzeMealPhoto.mockResolvedValue({ hintApplied: true, items: [item(100, 400)] });

    const result = await reestimateEntry({ userId: 'u', name: 'sernik baskijski', grams: 100, mealGroupId: 'g1' });

    expect(result?.viaPhoto).toBe(true);
    expect(result?.per100.calories).toBe(400);
    expect(analyzeMealPhoto).toHaveBeenCalledWith(expect.any(Blob), 'u', buildPhotoHint('sernik baskijski', 100));
    expect(parseFoodNL).not.toHaveBeenCalled();
  });

  it('uses the name only when the meal has no photo', async () => {
    fetchMealPhotoBlob.mockResolvedValue(null);
    const result = await reestimateEntry({ userId: 'u', name: 'kawa latte', grams: 300, mealGroupId: 'g1' });
    expect(result).toEqual({ per100: expect.objectContaining({ calories: 358 }), viaPhoto: false });
    expect(analyzeMealPhoto).not.toHaveBeenCalled();
  });

  it('falls back to the name when the photo analysis fails', async () => {
    fetchMealPhotoBlob.mockResolvedValue(new Blob(['jpg']));
    analyzeMealPhoto.mockRejectedValue(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await reestimateEntry({ userId: 'u', name: 'x', grams: 100, mealGroupId: 'g1' });
    warn.mockRestore();
    expect(result?.viaPhoto).toBe(false);
  });

  it('ignores a photo answer that did not use the hint and falls back to the name', async () => {
    fetchMealPhotoBlob.mockResolvedValue(new Blob(['jpg']));
    analyzeMealPhoto.mockResolvedValue({ items: [item(100, 400), item(200, 900)] });
    const result = await reestimateEntry({ userId: 'u', name: 'x', grams: 100, mealGroupId: 'g1' });
    expect(result).toEqual({ per100: expect.objectContaining({ calories: 358 }), viaPhoto: false });
  });

  it('skips the photo lookup for an entry without a meal group', async () => {
    await reestimateEntry({ userId: 'u', name: 'x', grams: 100, mealGroupId: null });
    expect(fetchMealPhotoBlob).not.toHaveBeenCalled();
  });
});
