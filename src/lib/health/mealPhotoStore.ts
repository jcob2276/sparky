import { supabase } from '../supabase';

const BUCKET = 'meal-photos';

/** Stores the photo a meal was captured from. Call only after the meal itself was saved. */
export async function saveMealPhoto(userId: string, mealGroupId: string, image: Blob): Promise<void> {
  const mimeType = image.type || 'image/jpeg';
  const storagePath = `${userId}/${mealGroupId}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, image, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from('nutrition_meal_photos').upsert(
    {
      user_id: userId,
      meal_group_id: mealGroupId,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: image.size,
    },
    { onConflict: 'user_id,meal_group_id' },
  );
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
}
