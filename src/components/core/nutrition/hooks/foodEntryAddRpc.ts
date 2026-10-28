import { getTodayWarsaw } from '../../../../lib/date';
import { rpcWithOfflineFallback } from '../../../../lib/offlineQueue';
import { notify } from '../../../../lib/notify';

const OFFLINE_QUEUED_MESSAGE =
  'Brak sieci — posiłek zapisany lokalnie, zsynchronizuje się automatycznie';

const SAVE_FAILED_MESSAGE = 'Zapis nie powiódł się';

/** Macro fields shared by every `add_food_entry` payload (per 100 g). */
export interface FoodEntryMacros {
  library_id?: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  saturated_fat?: number | null;
  salt?: number | null;
}

/** Builds the `p_entry` JSON for the `add_food_entry` RPC. */
export function buildFoodEntryPayload(
  macros: FoodEntryMacros,
  mealType: string,
  parseMeta: unknown
): Record<string, unknown> {
  return {
    library_id: macros.library_id,
    name: macros.name,
    brand: macros.brand,
    barcode: macros.barcode,
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    fiber: macros.fiber,
    sugar: macros.sugar,
    saturated_fat: macros.saturated_fat ?? null,
    salt: macros.salt ?? null,
    meal_type: mealType,
    request_id: crypto.randomUUID(),
    parse_meta: parseMeta,
  };
}

/**
 * Calls `add_food_entry` (with offline fallback) for today (Europe/Warsaw).
 * Shows the offline notice when the entry was queued; resolves to `queued`.
 */
export async function addFoodEntryRpc(
  userId: string,
  grams: number,
  entry: Record<string, unknown>
): Promise<boolean> {
  const { queued } = await rpcWithOfflineFallback(
    'add_food_entry',
    {
      p_user_id: userId,
      p_date: getTodayWarsaw(),
      p_grams: grams,
      p_entry: entry,
    },
    'Posiłek'
  );
  if (queued) notify(OFFLINE_QUEUED_MESSAGE, 'info');
  return queued;
}

export function toSaveErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : SAVE_FAILED_MESSAGE;
}
