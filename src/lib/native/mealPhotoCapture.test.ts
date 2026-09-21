// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { pickMealPhotoNative } from './mealPhotoCapture';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/camera', () => ({
  Camera: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    Uri: 'uri',
    Base64: 'base64',
    DataUrl: 'dataUrl',
  },
  CameraSource: {
    Camera: 'CAMERA',
    Photos: 'PHOTOS',
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    convertFileSrc: vi.fn((path: string) => `http://localhost/_capacitor_file_${path}`),
  },
}));

describe('pickMealPhotoNative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null on web runtime', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const res = await pickMealPhotoNative('camera');
    expect(res).toBeNull();
    expect(Camera.getPhoto).not.toHaveBeenCalled();
  });

  it('requests permissions when camera is not granted on native', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'prompt', photos: 'granted' });
    vi.mocked(Camera.requestPermissions).mockResolvedValue({ camera: 'granted', photos: 'granted' });
    vi.mocked(Camera.getPhoto).mockResolvedValue({
      base64String: btoa('test-image-binary'),
      format: 'jpeg',
      saved: false,
    });

    const file = await pickMealPhotoNative('camera');
    expect(Camera.checkPermissions).toHaveBeenCalled();
    expect(Camera.requestPermissions).toHaveBeenCalledWith({ permissions: ['camera'] });
    expect(file).toBeInstanceOf(File);
  });

  it('throws helpful error if user denies camera permission', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'denied', photos: 'granted' });
    vi.mocked(Camera.requestPermissions).mockResolvedValue({ camera: 'denied', photos: 'granted' });

    await expect(pickMealPhotoNative('camera')).rejects.toThrow(
      'Aplikacja potrzebuje uprawnień do aparatu',
    );
  });

  it('does not check camera permission when selecting from photos', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Camera.getPhoto).mockResolvedValue({
      base64String: btoa('photo-from-gallery'),
      format: 'png',
      saved: false,
    });

    const file = await pickMealPhotoNative('photos');
    expect(Camera.checkPermissions).not.toHaveBeenCalled();
    expect(file).toBeInstanceOf(File);
  });

  it('returns null quietly when user cancels capture', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'granted', photos: 'granted' });
    vi.mocked(Camera.getPhoto).mockRejectedValue(new Error('User cancelled photos app'));

    const file = await pickMealPhotoNative('camera');
    expect(file).toBeNull();
  });
});
