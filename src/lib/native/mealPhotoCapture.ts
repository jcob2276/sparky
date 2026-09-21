import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { isNativePlatform } from './platform';

async function photoToFile(photo: Photo): Promise<File> {
  if (photo.base64String) {
    const byteCharacters = atob(photo.base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const mime = photo.format ? `image/${photo.format}` : 'image/jpeg';
    const blob = new Blob([byteArray], { type: mime });
    return new File([blob], `meal-${Date.now()}.${photo.format || 'jpg'}`, { type: mime });
  }

  const candidates: string[] = [];
  if (photo.webPath) candidates.push(photo.webPath);
  if (photo.path) {
    try {
      const converted = Capacitor.convertFileSrc(photo.path);
      if (!candidates.includes(converted)) candidates.push(converted);
    } catch {
      // ignore conversion failure if path is already invalid
    }
  }

  let lastError: unknown;
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const mime = blob.type || (photo.format ? `image/${photo.format}` : 'image/jpeg');
      return new File([blob], `meal-${Date.now()}.${photo.format || 'jpg'}`, { type: mime });
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Błąd wczytywania zdjęcia: ${lastError.message}`
      : 'Nie udało się wczytać zrobionego zdjęcia',
  );
}

function isUserCancel(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /cancel|dismiss|no image|no photo|closed/i.test(msg);
}

async function ensureCameraPermission(): Promise<void> {
  try {
    const perm = await Camera.checkPermissions();
    if (perm.camera === 'granted') return;

    const req = await Camera.requestPermissions({ permissions: ['camera'] });
    if (req.camera !== 'granted') {
      throw new Error('Aplikacja potrzebuje uprawnień do aparatu, aby zrobić zdjęcie posiłku. Włącz uprawnienia w ustawieniach telefonu.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('uprawnień do aparatu')) {
      throw error;
    }
    console.warn('[mealPhotoCapture] Camera permission check warning:', error);
  }
}

/** APK: bezpośredni aparat ('camera') lub galeria ('photos'). Web/PWA: null — użyj `<input type="file">`. */
export async function pickMealPhotoNative(sourceType: 'camera' | 'photos' = 'camera'): Promise<File | null> {
  if (!isNativePlatform()) return null;

  if (sourceType === 'camera') {
    await ensureCameraPermission();
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      width: 1440,
      height: 1440,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: sourceType === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      correctOrientation: true,
      saveToGallery: false,
    });

    if (!photo.webPath && !photo.path && !photo.base64String) return null;
    return await photoToFile(photo);
  } catch (error: unknown) {
    if (isUserCancel(error)) return null;
    throw error;
  }
}
