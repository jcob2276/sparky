import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeEdge, prepareVisionUpload, blobToBase64 } = vi.hoisted(() => ({
  invokeEdge: vi.fn(),
  prepareVisionUpload: vi.fn(),
  blobToBase64: vi.fn(),
}));

vi.mock('../supabase', () => ({ invokeEdge }));
vi.mock('../imageThumbnail', () => ({ prepareVisionUpload }));
vi.mock('../imageEncoding', () => ({ blobToBase64 }));

import { scanMealPhoto } from './mealPhotoScan';

describe('scanMealPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareVisionUpload.mockResolvedValue(new Blob(['small'], { type: 'image/jpeg' }));
    blobToBase64.mockResolvedValue('encoded');
  });

  it('sends a compressed image through the canonical food parser', async () => {
    const meal = {
      parserVersion: 'meal-photo-v1',
      estimate: { calories: 500, minKcal: 400, maxKcal: 650 },
      questions: [],
      items: [{ id: 'rice', name: 'Ryż', grams: 200 }],
    };
    invokeEdge.mockResolvedValue({ meal });

    await expect(scanMealPhoto(new File(['photo'], 'meal.png'), 'user-1')).resolves.toBe(meal);
    expect(prepareVisionUpload).toHaveBeenCalledWith(expect.any(File));
    expect(invokeEdge).toHaveBeenCalledWith('parse-food-nl', expect.objectContaining({
      body: expect.objectContaining({ mode: 'meal_photo', userId: 'user-1', imageBase64: 'encoded' }),
    }));
  });

  it('rejects an empty photo result', async () => {
    invokeEdge.mockResolvedValue({ meal: { items: [] } });
    await expect(scanMealPhoto(new File(['photo'], 'meal.png'), 'user-1'))
      .rejects.toThrow('Nie udało się rozpoznać posiłku');
  });

  it('maps edge transport errors to a clearer message', async () => {
    invokeEdge.mockRejectedValue(new Error('Failed to send a request to the Edge Function'));
    await expect(scanMealPhoto(new File(['photo'], 'meal.png'), 'user-1'))
      .rejects.toThrow('Nie udało się wysłać zdjęcia do serwera');
  });
});
