import { TIMEOUTS } from '../constants';
import { blobToBase64 } from '../imageEncoding';
import { prepareVisionUpload } from '../imageThumbnail';
import { invokeEdge } from '../supabase';
import type { EdgeFunctionResponses } from '../edgeTypes';

type MenuAnalysis = NonNullable<EdgeFunctionResponses['parse-food-nl']['menuAnalysis']>;
type FridgeAnalysis = NonNullable<EdgeFunctionResponses['parse-food-nl']['fridgeAnalysis']>;

export async function scanRestaurantMenu(
  input: { file?: File; text?: string },
  userId: string
): Promise<MenuAnalysis> {
  let imageBase64: string | undefined;
  if (input.file) {
    const image = await prepareVisionUpload(input.file);
    imageBase64 = await blobToBase64(image);
  }

  const response = await invokeEdge('parse-food-nl', {
    body: {
      mode: 'restaurant_menu',
      userId,
      imageBase64,
      mimeType: imageBase64 ? 'image/jpeg' : undefined,
      text: input.text,
      clientTime: new Date().toISOString(),
    },
    signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
  });

  if (!response?.menuAnalysis) {
    throw new Error('Nie udało się przeanalizować menu restauracji.');
  }
  return response.menuAnalysis;
}

export async function scanFridgeIngredients(
  input: { file?: File; text?: string },
  userId: string
): Promise<FridgeAnalysis> {
  let imageBase64: string | undefined;
  if (input.file) {
    const image = await prepareVisionUpload(input.file);
    imageBase64 = await blobToBase64(image);
  }

  const response = await invokeEdge('parse-food-nl', {
    body: {
      mode: 'fridge_ingredients',
      userId,
      imageBase64,
      mimeType: imageBase64 ? 'image/jpeg' : undefined,
      text: input.text,
      clientTime: new Date().toISOString(),
    },
    signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
  });

  if (!response?.fridgeAnalysis) {
    throw new Error('Nie udało się przeanalizować składników w lodówce.');
  }
  return response.fridgeAnalysis;
}
