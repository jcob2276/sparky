import { TIMEOUTS } from '../constants';
import { blobToBase64 } from '../imageEncoding';
import { prepareVisionUpload } from '../imageThumbnail';
import { invokeEdge } from '../supabase';
import type { MealPhotoResponse } from '../edgeTypes';

/** Chwilowe przeciążenie dostawcy AI (HTTP 503 „high demand”) mija zwykle po kilku sekundach, więc ponawiamy po cichu. */
const OVERLOAD_RETRY_DELAYS_MS = [5_000, 10_000];

function isOverload(cause: unknown): boolean {
  const msg = cause instanceof Error ? cause.message : String(cause);
  return /przeciążon|high demand|\b503\b|unavailable/i.test(msg);
}

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

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

/** Sends an already compressed photo for analysis. `hint` is the user's correction of what is on the plate. */
export async function analyzeMealPhoto(
  image: Blob,
  userId: string,
  hint?: string,
): Promise<MealPhotoResponse> {
  const imageBase64 = await blobToBase64(image);

  type EdgeResponse = Awaited<ReturnType<typeof invokeEdge<'parse-food-nl'>>>;
  const body = {
    mode: 'meal_photo' as const,
    userId,
    mimeType: 'image/jpeg',
    imageBase64,
    clientTime: new Date().toISOString(),
    ...(hint?.trim() ? { hint: hint.trim() } : {}),
  };
  let response: EdgeResponse | undefined;
  for (let attempt = 0; response === undefined; attempt++) {
    try {
      response = await invokeEdge('parse-food-nl', { body, signal: AbortSignal.timeout(TIMEOUTS.llmHeavy) });
    } catch (cause: unknown) {
      const delay = OVERLOAD_RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isOverload(cause)) throw wrapPhotoUploadError(cause);
      await sleep(delay);
    }
  }

  const meal = response.meal;
  if (!meal?.items.length) {
    throw new Error('Nie udało się rozpoznać posiłku na zdjęciu');
  }
  return meal;
}

/** `onPrepared` receives the compressed JPEG that was sent for analysis, so the caller can keep it. */
export async function scanMealPhoto(
  file: File,
  userId: string,
  onPrepared?: (image: Blob) => void,
): Promise<MealPhotoResponse> {
  const image = await prepareVisionUpload(file);
  onPrepared?.(image);
  return analyzeMealPhoto(image, userId);
}
