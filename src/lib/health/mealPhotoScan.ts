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
  return cause instanceof Error ? cause : new Error(msg);
}

export async function scanMealPhoto(file: File, userId: string): Promise<MealPhotoResponse> {
  const image = await prepareVisionUpload(file);
  const imageBase64 = await blobToBase64(image);

  let response: Record<string, unknown>;
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

  const meal = response.meal as MealPhotoResponse | undefined;
  if (!meal?.items.length) {
    throw new Error('Nie udało się rozpoznać posiłku na zdjęciu');
  }
  return meal;
}
