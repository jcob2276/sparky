import type { Json } from '../database.types';
import { supabase } from '../supabase';
import { buildMealFingerprint, type MealDraftItem, type NutritionDayCompleteness } from './nutritionTracker';
import { scheduleNutritionRefresh } from './nutritionSideEffects';
import { deriveItemUncertainty } from './foodTrust';

export type MealCaptureSource = 'photo' | 'text' | 'barcode' | 'repeat' | 'search';
export type CaptureDraftItem = MealDraftItem;

export interface CaptureItemPayload {
  name: string;
  brand: null;
  barcode: null;
  grams: number;
  requestId: string;
  per100: Record<string, number | null>;
  parseMeta: Record<string, unknown>;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Poziom zaufania wynika ze źródła makro; pochodzenie z bazy/biblioteki nie podnosi szacunku ani danych OFF. */
function captureTrustLevel(item: CaptureDraftItem): 'confirmed' | 'reference' | 'estimated' {
  const macroSource = item.parseMeta?.macroSource;
  if (macroSource === 'user_correction') return 'confirmed';
  if (macroSource === 'llm_estimate') return 'estimated';
  if (macroSource === 'off' || macroSource === 'reference_pl' || macroSource === 'usda' || macroSource === 'generic') return 'reference';
  return item.source === 'library' || item.source === 'database' ? 'confirmed' : 'estimated';
}

export function buildCaptureItems(items: CaptureDraftItem[], inputMode?: MealCaptureSource): CaptureItemPayload[] {
  return items.map((item) => {
    if (!Number.isFinite(item.grams) || item.grams <= 0) {
      throw new Error(`Podaj prawidłową masę porcji dla „${item.name}”.`);
    }
    const grams = Math.max(1, Math.round(item.grams));
    const scale = 100 / grams;
    const trustLevel = captureTrustLevel(item);
    return {
      name: item.name.trim(),
      brand: null,
      barcode: null,
      grams,
      requestId: crypto.randomUUID(),
      per100: {
        calories: Math.round(item.calories * scale),
        protein: round1(item.protein * scale),
        carbs: round1(item.carbs * scale),
        fat: round1(item.fat * scale),
        fiber: item.fiber == null ? null : round1(item.fiber * scale),
        sugar: item.sugar == null ? null : round1(item.sugar * scale),
        saturated_fat: item.saturatedFat == null ? null : round1(item.saturatedFat * scale),
        salt: item.salt == null ? null : Math.round(item.salt * scale * 100) / 100,
      },
      parseMeta: {
        ...(item.parseMeta ?? {}),
        source: 'user_confirmed',
        trust_level: trustLevel,
        user_confirmed: true,
        uncertainty_pct: deriveItemUncertainty({
          macroSource: item.parseMeta?.macroSource,
          itemSource: item.source,
          confidence: item.confidence,
          explicitGrams: item.parseMeta?.explicitGrams,
          inputMode,
          priorUncertaintyPct: item.parseMeta?.priorUncertaintyPct,
        }),
      },
    };
  });
}

export async function confirmMealCapture(input: {
  userId: string;
  date: string;
  mealType: string;
  source: MealCaptureSource;
  items: CaptureDraftItem[];
  estimate?: { calories: number; minKcal: number; maxKcal: number };
  memoryName?: string;
  /** Stable op id — required so retry/offline replay cannot mint a second meal (DC-04). */
  captureId: string;
  loggedAt?: string;
}): Promise<void> {
  if (!input.items.length) throw new Error('Posiłek nie zawiera żadnych pozycji');
  const captureId = input.captureId?.trim();
  if (!captureId) {
    throw new Error('Brak captureId — nadaj ID przed pierwszym zapisem i trzymaj je przy retry.');
  }
  const items = buildCaptureItems(input.items, input.source);
  const fingerprint = buildMealFingerprint(input.items);
  const { error } = await supabase.rpc('confirm_nutrition_meal_capture', {
    p_user_id: input.userId,
    p_capture_id: captureId,
    p_date: input.date,
    p_meal_type: input.mealType,
    p_source: input.source,
    p_items: items as unknown as Json,
    p_parse_summary: {
      estimate: input.estimate ?? null,
      itemCount: items.length,
      parserVersion: input.source === 'photo' ? 'meal-photo-v1' : 'food-trust-v2',
    } as Json,
    p_memory: fingerprint ? {
      fingerprint,
      name: input.memoryName ?? input.items.map((item) => item.name).join(' + ').slice(0, 160),
    } : undefined,
  });
  if (error) throw error;

  if (input.loggedAt) {
    try {
      const { error: timeError } = await supabase
        .from('daily_food_entries')
        .update({ logged_at: input.loggedAt })
        .eq('user_id', input.userId)
        .eq('meal_group_id', captureId);
      if (timeError) throw timeError;
    } catch (cause) {
      throw new Error('Posiłek zapisany, ale nie udało się ustawić godziny. Ponów zapis, aby dokończyć.', { cause });
    }
  }

  scheduleNutritionRefresh(input.userId, input.date);
}

/** Zapisuje Twoją decyzję, czy dziennik dnia jest pełny; to jedyny sygnał dla kalibracji i bilansu tygodnia. */
export async function saveNutritionDayReview(userId: string, date: string, completeness: NutritionDayCompleteness) {
  const { error } = await supabase.from('nutrition_day_reviews').upsert(
    { user_id: userId, date, completeness, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,date' },
  );
  if (error) throw error;
}

export async function fetchNutritionDayReviews(userId: string, since: string) {
  const { data, error } = await supabase.from('nutrition_day_reviews')
    .select('date,completeness')
    .eq('user_id', userId)
    .gte('date', since);
  if (error) throw error;
  return (data ?? []) as Array<{ date: string; completeness: NutritionDayCompleteness }>;
}

