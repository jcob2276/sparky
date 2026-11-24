// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateThumbnail } from './imageThumbnail';

const file = new File(['x'], 'meal.jpg', { type: 'image/jpeg' });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('generateThumbnail', () => {
  it('explains the problem in Polish when the photo cannot be decoded at all', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new TypeError('Load failed')));
    class BrokenImage {
      src = '';
      decode = () => Promise.reject(new Error('decode failed'));
    }
    vi.stubGlobal('Image', BrokenImage);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();

    await expect(generateThumbnail(file)).rejects.toThrow('Nie udało się wczytać zdjęcia');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('treats an <img> fallback that yields no pixels as a failed decode', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new TypeError('Load failed')));
    class WorkingImage {
      src = '';
      naturalWidth = 0;
      naturalHeight = 0;
      decode = () => Promise.resolve();
    }
    vi.stubGlobal('Image', WorkingImage);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();

    // naturalWidth 0 means the decoder gave no pixels: still a clear error, not a blank upload
    await expect(generateThumbnail(file)).rejects.toThrow('Nie udało się wczytać zdjęcia');
  });
});
