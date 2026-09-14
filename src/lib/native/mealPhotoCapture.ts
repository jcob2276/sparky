import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativePlatform } from './platform';

async function photoUriToFile(webPath: string): Promise<File> {
  const response = await fetch(webPath);
  const blob = await response.blob();
  const type = blob.type || 'image/jpeg';
  return new File([blob], `meal-${Date.now()}.jpg`, { type });
}

function isUserCancel(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /cancel|dismiss|no image/i.test(msg);
}

/** APK: bezpośredni aparat ('camera') lub galeria ('photos'). Web/PWA: null — użyj `<input type="file">`. */
export async function pickMealPhotoNative(sourceType: 'camera' | 'photos' = 'camera'): Promise<File | null> {
  if (!isNativePlatform()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: sourceType === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!photo.webPath) return null;
    return photoUriToFile(photo.webPath);
  } catch (error: unknown) {
    if (isUserCancel(error)) return null;
    throw error;
  }
}
