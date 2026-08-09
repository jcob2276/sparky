import { generateThumbnail } from '../imageThumbnail';
import { invokeEdge } from '../supabase';
import { TIMEOUTS } from '../constants';
import type { FoodBase } from './foodTypes';
import { blobToBase64 } from '../imageEncoding';

export async function scanNutritionLabel(file: File, userId: string): Promise<FoodBase> {
  const image = await generateThumbnail(file, 1800, 0.86);
  const response = await invokeEdge('parse-food-nl', {
    body: {
      mode: 'label', userId, mimeType: 'image/jpeg',
      imageBase64: await blobToBase64(image),
    },
    signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
  });
  if (!response.label) throw new Error('Nie udało się odczytać etykiety');
  return response.label;
}
