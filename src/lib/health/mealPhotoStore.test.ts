import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upload, remove, upsert, createSignedUrls, selectIn, deleteEq, from, storageFrom } = vi.hoisted(() => {
  const upload = vi.fn();
  const remove = vi.fn();
  const upsert = vi.fn();
  const createSignedUrls = vi.fn();
  const selectIn = vi.fn();
  const select = vi.fn(() => ({ eq: () => ({ in: selectIn }) }));
  const deleteEq = vi.fn();
  const del = vi.fn(() => ({ eq: () => ({ eq: deleteEq }) }));
  return {
    upload,
    remove,
    upsert,
    createSignedUrls,
    selectIn,
    deleteEq,
    from: vi.fn(() => ({ upsert, select, delete: del })),
    storageFrom: vi.fn(() => ({ upload, remove, createSignedUrls })),
  };
});

vi.mock('../supabase', () => ({ supabase: { from, storage: { from: storageFrom } } }));

import { deleteMealPhoto, fetchMealPhotoUrls, saveMealPhoto } from './mealPhotoStore';

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

describe('fetchMealPhotoUrls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns nothing without querying when there are no meals', async () => {
    await expect(fetchMealPhotoUrls('user-1', [])).resolves.toEqual({});
    expect(from).not.toHaveBeenCalled();
  });

  it('maps signed URLs back to meal groups and skips meals without a photo', async () => {
    selectIn.mockResolvedValue({
      data: [{ meal_group_id: 'meal-1', storage_path: 'user-1/meal-1.jpg' }],
      error: null,
    });
    createSignedUrls.mockResolvedValue({
      data: [{ path: 'user-1/meal-1.jpg', signedUrl: 'https://signed/meal-1' }],
      error: null,
    });

    await expect(fetchMealPhotoUrls('user-1', ['meal-1', 'meal-2'])).resolves.toEqual({
      'meal-1': 'https://signed/meal-1',
    });
    expect(createSignedUrls).toHaveBeenCalledWith(['user-1/meal-1.jpg'], 3600);
  });
});

describe('deleteMealPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteEq.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it('deletes the row and then the file', async () => {
    await deleteMealPhoto('user-1', 'meal-1');
    expect(from).toHaveBeenCalledWith('nutrition_meal_photos');
    expect(remove).toHaveBeenCalledWith(['user-1/meal-1.jpg']);
  });

  it('keeps the file when the row cannot be deleted', async () => {
    deleteEq.mockResolvedValue({ error: new Error('rls') });
    await expect(deleteMealPhoto('user-1', 'meal-1')).rejects.toThrow('rls');
    expect(remove).not.toHaveBeenCalled();
  });

  it('does not fail when only the file removal fails', async () => {
    remove.mockResolvedValue({ error: new Error('gone') });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(deleteMealPhoto('user-1', 'meal-1')).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
