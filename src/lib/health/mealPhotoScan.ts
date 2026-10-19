import { TIMEOUTS } from '../constants';
import { blobToBase64 } from '../imageEncoding';
import { prepareVisionUpload } from '../imageThumbnail';
import { invokeEdge } from '../supabase';
import type { MealPhotoResponse } from '../edgeTypes';

function wrapPhotoUploadError(cause: unknown): Error {
  const msg = cause instanceof Error ? cause.message : String(cause);
  if (/failed to send a request|networkerror|fetch failed|load failed/i.test(msg)) {
    return new Error(
      'Nie udało się wysłać zdjęcia do serwera — słaba sieć lub plik za duży. Spróbuj bliższego ujęcia.',
      { cause },
    );
  }
  if (/internal server error/i.test(msg)) {
    return new Error(
      'Serwer analizy zdjęć jest chwilowo przeciążony. Spróbuj ponownie lub opisz posiłek tekstem.',
      { cause },
    );
  }
  return cause instanceof Error ? cause : new Error(msg);
}

/** `onPrepared` receives the compressed JPEG that was sent for analysis, so the caller can keep it. */
export async function scanMealPhoto(
  file: File,
  userId: string,
  onPrepared?: (image: Blob) => void,
): Promise<MealPhotoResponse> {
  const image = await prepareVisionUpload(file);
  onPrepared?.(image);
  const imageBase64 = await blobToBase64(image);

  let response: Awaited<ReturnType<typeof invokeEdge<'parse-food-nl'>>>;
  try {
    response = await invokeEdge('parse-food-nl', {
      body: {
        mode: 'meal_photo',
        userId,
        mimeType: 'image/jpeg',
        imageBase64,
        clientTime: new Date().toISOString(),
      },
      signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
    });
  } catch (cause: unknown) {
    throw wrapPhotoUploadError(cause);
  }

  const meal = response.meal;
  if (!meal?.items.length) {
    throw new Error('Nie udało się rozpoznać posiłku na zdjęciu');
  }
  return meal;
}
