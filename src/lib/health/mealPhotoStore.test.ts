import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upload, remove, upsert, from, storageFrom } = vi.hoisted(() => {
  const upload = vi.fn();
  const remove = vi.fn();
  const upsert = vi.fn();
  return {
    upload,
    remove,
    upsert,
    from: vi.fn(() => ({ upsert })),
    storageFrom: vi.fn(() => ({ upload, remove })),
  };
});

vi.mock('../supabase', () => ({ supabase: { from, storage: { from: storageFrom } } }));

import { saveMealPhoto } from './mealPhotoStore';

describe('saveMealPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    upsert.mockResolvedValue({ error: null });
  });

  it('uploads into the user folder and records the photo for the meal', async () => {
    const image = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    await saveMealPhoto('user-1', 'meal-1', image);

    expect(storageFrom).toHaveBeenCalledWith('meal-photos');
    expect(upload).toHaveBeenCalledWith('user-1/meal-1.jpg', image, { contentType: 'image/jpeg', upsert: true });
    expect(from).toHaveBeenCalledWith('nutrition_meal_photos');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', meal_group_id: 'meal-1', storage_path: 'user-1/meal-1.jpg' }),
      { onConflict: 'user_id,meal_group_id' },
    );
  });

  it('removes the uploaded file when the database row cannot be written', async () => {
    upsert.mockResolvedValue({ error: new Error('rls') });
    await expect(saveMealPhoto('user-1', 'meal-1', new Blob(['x']))).rejects.toThrow('rls');
    expect(remove).toHaveBeenCalledWith(['user-1/meal-1.jpg']);
  });

  it('does not write a row when the upload fails', async () => {
    upload.mockResolvedValue({ error: new Error('too large') });
    await expect(saveMealPhoto('user-1', 'meal-1', new Blob(['x']))).rejects.toThrow('too large');
    expect(upsert).not.toHaveBeenCalled();
  });
});
