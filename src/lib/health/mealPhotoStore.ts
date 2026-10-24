import { supabase } from '../supabase';

const BUCKET = 'meal-photos';
const SIGNED_URL_TTL_SECONDS = 3600;

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

/** Removes the photo of a meal (row first, so a failed file delete leaves at worst an orphaned file). */
export async function deleteMealPhoto(userId: string, mealGroupId: string): Promise<void> {
  const { error } = await supabase
    .from('nutrition_meal_photos')
    .delete()
    .eq('user_id', userId)
    .eq('meal_group_id', mealGroupId);
  if (error) throw error;
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([`${userId}/${mealGroupId}.jpg`]);
  if (removeError) console.warn('[mealPhotoStore] photo file was not removed', removeError);
}

/** Signed URLs for the photos of the given meals, keyed by meal_group_id. Meals without a photo are absent. */
export async function fetchMealPhotoUrls(userId: string, mealGroupIds: string[]): Promise<Record<string, string>> {
  if (!mealGroupIds.length) return {};
  const { data: rows, error } = await supabase
    .from('nutrition_meal_photos')
    .select('meal_group_id, storage_path')
    .eq('user_id', userId)
    .in('meal_group_id', mealGroupIds);
  if (error) throw error;
  if (!rows?.length) return {};

  const { data: signed, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((row) => row.storage_path), SIGNED_URL_TTL_SECONDS);
  if (urlError) throw urlError;

  const urlByPath = new Map<string, string>();
  for (const item of signed ?? []) {
    if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
  }
  const result: Record<string, string> = {};
  for (const row of rows) {
    const url = urlByPath.get(row.storage_path);
    if (url) result[row.meal_group_id] = url;
  }
  return result;
}
