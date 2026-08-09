import { getWarsawHour } from '../../lib/date';
import { supabase } from '../supabase'
import { invokeEdge } from '../supabase'
import { TIMEOUTS } from '../constants'
import { confirmMealCapture } from './nutritionTrackerApi'

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Śniadanie' },
  { id: 'lunch', label: 'Obiad' },
  { id: 'dinner', label: 'Kolacja' },
  { id: 'snack', label: 'Przekąska' },
] as const

export type MealTypeId = (typeof MEAL_TYPES)[number]['id']

interface FoodParseMeta {
  macroSource: 'library' | 'generic' | 'reference_pl' | 'off' | 'llm_estimate' | 'user_correction'
  matchScore?: number
  matchedName?: string
  dataSource?: string
  parserVersion: string
  quantity?: number
  unit?: string
  explicitGrams?: boolean
  warnings?: string[]
  validationStatus?: 'accepted' | 'review'
}

export interface ParsedFoodItem {
  name: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  confidence: 'high' | 'medium' | 'low'
  source: 'llm' | 'database' | 'library'
  assumptions?: string[]
  parseMeta?: FoodParseMeta
}

export interface TodayNutritionSnapshot {
  calories: number
  protein: number
  targetKcal: number | null
  targetProtein: number | null
  avgFoodQuality: number | null
  foodQualityAnalysis: string | null
}

export * from './foodFavorites'

export function defaultMealType(): MealTypeId {
  const hour = getWarsawHour()
  if (hour < 11) return 'breakfast'
  if (hour < 16) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

export async function parseFoodNL(text: string, userId: string, _accessToken: string): Promise<ParsedFoodItem[]> {
  let json: { items?: ParsedFoodItem[] }
  try {
    json = await invokeEdge('parse-food-nl', {
      body: { text: text.trim(), userId, clientTime: new Date().toISOString() },
      signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
    }) as { items?: ParsedFoodItem[] }
  } catch (e: unknown) {
    const msg = e instanceof Error ? (e as Error).message : String(e)
    if (/timed out|timeout|abort/i.test(msg)) {
      throw new Error('Parsowanie trwało za długo — spróbuj ponownie za chwilę.', { cause: e })
    }
    throw e
  }
  return json.items ?? []
}

export function needsReview(items: ParsedFoodItem[]): boolean {
  if (!items.length) return false
  return items.some((i) => i.confidence !== 'high')
}

export async function saveParsedFoodItems(
  userId: string,
  items: ParsedFoodItem[],
  opts: { date: string; mealType: string; mealGroupId?: string },
): Promise<void> {
  await confirmMealCapture({
    userId,
    date: opts.date,
    mealType: opts.mealType,
    source: 'text',
    items: items.map((item, index) => ({ ...item, id: `text-${index + 1}` })),
    captureId: opts.mealGroupId,
  })
}

export async function saveFoodCorrection(
  userId: string,
  queryName: string,
  correctedGrams: number,
  correctedName?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('save_food_correction', {
    p_user_id: userId,
    p_query_name: queryName,
    p_corrected_grams: correctedGrams,
    p_corrected_name: correctedName ?? undefined,
  })
  if (error) throw error
}

export function confidenceLabel(item: ParsedFoodItem): string | null {
  if (item.source === 'library' || item.source === 'database') return 'baza'
  if (item.confidence === 'high') return 'ok'
  if (item.confidence === 'low' || item.confidence === 'medium') return 'sprawdź'
  return null
}
