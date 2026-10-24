import { buildMealPhotoPrompt } from './mealPhotoPrompt.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { parseJsonFromContent } from '../_shared/deepseek.ts'
import {
  finalizeParsedItems,
  type UserParseContext,
  type FoodCorrection,
} from '../_shared/foodParseCore.ts'
import {
  normalizeMealPhotoResponse,
  type MealPhotoDraft,
} from '../_shared/foodParse/mealPhoto.ts'
import { classifyMealPhotoResponse, geminiFailureReason, readGeminiText } from './visionResponse.ts'

function validMacro(value: unknown, max = 100): number | null {
  if (value == null) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= max ? Math.round(number * 10) / 10 : null
}

function parseJsonSafe(content: string): Record<string, unknown> {
  const parsed = parseJsonFromContent(content)
  if (parsed && typeof parsed === 'object') return parsed
  try {
    return JSON.parse(content || '{}')
  } catch {
    return {}
  }
}

export async function callVisionLlm({
  prompt,
  imageBase64,
  mimeType,
  userId,
  feature,
  maxTokens = 1800,
}: {
  prompt: string
  imageBase64: string
  mimeType: string
  userId?: string
  feature: string
  maxTokens?: number
}): Promise<string> {
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) {
    throw new Error('Brak GEMINI_API_KEY w konfiguracji')
  }

  const models = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
  ]

  let lastError: unknown = null
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...(imageBase64 && mimeType ? [{ inlineData: { mimeType, data: imageBase64 } }] : []),
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: maxTokens,
          },
        }),
        signal: AbortSignal.timeout(25000),
      })
      if (res.ok) {
        const result = readGeminiText(await res.json())
        const failure = geminiFailureReason(result)
        if (!failure && result.text) return result.text
        console.warn(`[mealVision] Gemini (${model}) ${failure}; feature=${feature}`)
        lastError = new Error(`Gemini: ${failure}`)
      } else {
        const errBody = await res.text().catch(() => '')
        console.warn(`[mealVision] Gemini (${model}) HTTP ${res.status}: ${errBody.slice(0, 200)}`)
        lastError = new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 100)}`)
      }
    } catch (err) {
      console.warn(`[mealVision] Gemini (${model}) failed:`, err)
      lastError = err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Błąd analizy obrazu przez modele Gemini')
}

export async function parseNutritionLabel(imageBase64: string, mimeType: string, userId?: string) {
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new Error('Unsupported image type')
  if (!imageBase64 || imageBase64.length > 8_000_000) throw new Error('Image is missing or too large')
  const content = await callVisionLlm({
    prompt: `Odczytaj etykietę żywieniową. Zwróć wyłącznie JSON z wartościami na 100 g lub 100 ml: {"name":string,"brand":string|null,"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number|null,"sugar":number|null,"saturatedFat":number|null,"servingGrams":number|null,"confidence":"high"|"medium"|"low"}. Pole saturatedFat to „w tym kwasy tłuszczowe nasycone” (ustaw null, jeśli etykieta go nie podaje, nie zgaduj). Nie przeliczaj porcji na 100 g, jeśli na zdjęciu brakuje podstawy przeliczenia. Wtedy ustaw confidence="low" i brakujące pola null.`,
    imageBase64,
    mimeType,
    userId,
    feature: 'nutrition-label-ocr',
    maxTokens: 2000,
  })
  const raw = parseJsonSafe(content)
  const calories = validMacro(raw.calories, 1000)
  const protein = validMacro(raw.protein)
  const carbs = validMacro(raw.carbs)
  const fat = validMacro(raw.fat)
  if (!raw.name || calories == null || protein == null || carbs == null || fat == null) {
    throw new Error('Label is incomplete or unreadable')
  }
  const macroCalories = protein * 4 + carbs * 4 + fat * 9
  const labelConfidence = ['high', 'medium', 'low'].includes(String(raw.confidence)) ? String(raw.confidence) : 'medium'
  const confidence = macroCalories > 0 && Math.abs(macroCalories - calories) / calories > 0.2
    ? 'low' : labelConfidence
  return {
    name: String(raw.name).slice(0, 160),
    brand: raw.brand ? String(raw.brand).slice(0, 100) : null,
    barcode: null,
    calories, protein, carbs, fat,
    fiber: validMacro(raw.fiber), sugar: validMacro(raw.sugar),
    // Nasycone to część tłuszczu: wartość większa niż całkowity tłuszcz to błąd odczytu → traktujemy jak brak.
    saturated_fat: (() => {
      const value = validMacro(raw.saturatedFat)
      return value != null && value <= fat + 0.05 ? value : null
    })(),
    defaultGrams: validMacro(raw.servingGrams, 2000) ?? 100,
    source: 'label_ocr',
    confidence,
  }
}

function validateMealImage(imageBase64: string, mimeType: string) {
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new Error('Unsupported image type')
  if (!imageBase64 || imageBase64.length > 8_000_000) throw new Error('Image is missing or too large')
}

function withFinalizedNutrition(
  draft: MealPhotoDraft,
  finalized: Awaited<ReturnType<typeof finalizeParsedItems>>,
): MealPhotoDraft {
  const items = draft.items.map((item, index) => {
    const finalizedItem = finalized[index]
    const parseMeta = finalizedItem?.parseMeta ?? item.parseMeta
    return {
      ...item,
      ...(finalizedItem ?? {}),
      id: item.id,
      portionRange: item.portionRange,
      questionCandidates: item.questionCandidates,
      parseMeta: {
        ...parseMeta,
        macroSource: parseMeta?.macroSource ?? 'llm_estimate' as const,
        parserVersion: 'meal-photo-v1',
        validationStatus: 'review' as const,
      },
    }
  })
  const calories = items.reduce((sum, item) => sum + item.calories, 0)
  const minKcal = items.reduce(
    (sum, item) => sum + item.calories * item.portionRange.minGrams / item.grams,
    0,
  )
  const maxKcal = items.reduce(
    (sum, item) => sum + item.calories * item.portionRange.maxGrams / item.grams,
    0,
  )
  return {
    ...draft,
    items,
    estimate: {
      calories: Math.round(calories),
      minKcal: Math.max(0, Math.round(minKcal)),
      maxKcal: Math.max(Math.round(calories), Math.round(maxKcal)),
    },
  }
}

export async function parseMealPhoto(
  imageBase64: string,
  mimeType: string,
  userId: string | undefined,
  ctx: UserParseContext,
  corrections: FoodCorrection[],
  db: ReturnType<typeof createServiceClient>,
  supabaseUrl: string,
  serviceKey: string,
  hint?: string,
) {
  validateMealImage(imageBase64, mimeType)
  const prompt = buildMealPhotoPrompt(ctx, hint)
  const content = await callVisionLlm({
    prompt,
    imageBase64,
    mimeType,
    userId,
    feature: 'nutrition-meal-photo',
    maxTokens: 6000,
  })
  const parsed = parseJsonSafe(content)
  if (classifyMealPhotoResponse(parsed) === 'unreadable') {
    console.warn(`[mealVision] unreadable meal-photo reply (len=${content.length}): ${content.slice(0, 160).replace(/\s+/g, ' ')}`)
    throw new Error('Model zwrócił nieczytelną odpowiedź na zdjęcie posiłku')
  }
  let draft: MealPhotoDraft
  try {
    draft = normalizeMealPhotoResponse(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('no food items')) {
      console.warn(`[mealVision] model reported no food items (len=${content.length}): ${content.slice(0, 160).replace(/\s+/g, ' ')}`)
      return {
        items: [],
        questions: [],
        estimate: { calories: 0, minKcal: 0, maxKcal: 0 },
        parserVersion: 'meal-photo-v1' as const,
      }
    }
    throw err
  }

  if (!draft.items.length) {
    return draft
  }

  const textApiKey = Deno.env.get('DEEPSEEK_API_KEY') || ''
  const finalized = await finalizeParsedItems(draft.items, {
    originalText: draft.items.map((item) => `${item.name} ${item.grams}g`).join(', '),
    corrections,
    supabaseUrl,
    serviceKey,
    userId,
    db,
    apiKey: textApiKey,
    parseContext: ctx,
  })
  return withFinalizedNutrition(draft, finalized)
}
