import { TIMEOUTS } from '../constants';
import { blobToBase64 } from '../imageEncoding';
import { generateThumbnail } from '../imageThumbnail';
import { invokeEdge } from '../supabase';
import type { MealPhotoResponse } from '../edgeTypes';

export async function scanMealPhoto(file: File, userId: string): Promise<MealPhotoResponse> {
  const image = await generateThumbnail(file, 1800, 0.84);
  const response = await invokeEdge('parse-food-nl', {
    body: {
      mode: 'meal_photo',
      userId,
      mimeType: 'image/jpeg',
      imageBase64: await blobToBase64(image),
      clientTime: new Date().toISOString(),
    },
    signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
  });
  if (!response.meal?.items.length) {
    throw new Error('Nie udało się rozpoznać posiłku na zdjęciu');
  }
  return response.meal;
}
