import type { Json } from '../database.types';
import { supabase } from '../supabase';
import { buildMealFingerprint, type MealDraftItem, type NutritionDayCompleteness } from './nutritionTracker';
import { scheduleNutritionRefresh } from './nutritionSideEffects';

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

export function buildCaptureItems(items: CaptureDraftItem[]): CaptureItemPayload[] {
  return items.map((item) => {
    const grams = Math.max(1, Math.round(item.grams));
    const scale = 100 / grams;
    const macroSource = item.parseMeta?.macroSource;
    const trustLevel = item.source === 'library' || item.source === 'database' || macroSource === 'user_correction'
      ? 'confirmed'
      : macroSource === 'off' || macroSource === 'reference_pl'
        ? 'reference'
        : 'estimated';
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
      },
      parseMeta: {
        ...(item.parseMeta ?? {}),
        source: 'user_confirmed',
        trust_level: trustLevel,
        user_confirmed: true,
        uncertainty_pct: item.confidence === 'high' ? 8 : item.confidence === 'medium' ? 15 : 25,
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
  captureId?: string;
}): Promise<void> {
  if (!input.items.length) throw new Error('Posiłek nie zawiera żadnych pozycji');
  const captureId = input.captureId ?? crypto.randomUUID();
  const items = buildCaptureItems(input.items);
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
  scheduleNutritionRefresh(input.userId, input.date);
}

export async function upsertNutritionDayReview(
  userId: string,
  date: string,
  completeness: NutritionDayCompleteness,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('nutrition_day_reviews').upsert({
    user_id: userId,
    date,
    completeness,
    confirmed_at: now,
    updated_at: now,
  }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function fetchNutritionDayReview(userId: string, date: string) {
  const { data, error } = await supabase.from('nutrition_day_reviews')
    .select('completeness,confirmed_at')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data as { completeness: NutritionDayCompleteness; confirmed_at: string } | null;
}

export async function fetchNutritionDayReviews(userId: string, since: string) {
  const { data, error } = await supabase.from('nutrition_day_reviews')
    .select('date,completeness')
    .eq('user_id', userId)
    .gte('date', since);
  if (error) throw error;
  return (data ?? []) as Array<{ date: string; completeness: NutritionDayCompleteness }>;
}

export async function fetchNutritionMealMemories(userId: string, limit = 8) {
  const { data, error } = await supabase.from('nutrition_meal_memories')
    .select('id,name,meal_type,items,confirmed_count,last_confirmed_at')
    .eq('user_id', userId)
    .order('last_confirmed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
