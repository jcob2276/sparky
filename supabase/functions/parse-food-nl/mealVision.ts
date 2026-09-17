import { createServiceClient } from '../_shared/supabase.ts'
import { openaiChat } from '../_shared/openai.ts'
import {
  finalizeParsedItems,
  type UserParseContext,
  type FoodCorrection,
} from '../_shared/foodParseCore.ts'
import {
  normalizeMealPhotoResponse,
  type MealPhotoDraft,
} from '../_shared/foodParse/mealPhoto.ts'

function validMacro(value: unknown, max = 100): number | null {
  if (value == null) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= max ? Math.round(number * 10) / 10 : null
}

async function callVisionLlm({
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
  if (geminiKey) {
    const models = ['gemini-3-flash-preview', 'gemini-3.5-flash']
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
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(20000),
        })
        if (res.ok) {
          const json = await res.json()
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) return text
        } else {
          console.warn(`[mealVision] Gemini (${model}) HTTP ${res.status}: ${await res.text().catch(() => '')}`)
        }
      } catch (err) {
        console.warn(`[mealVision] Gemini (${model}) request failed:`, err)
      }
    }
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (openaiKey) {
    const { content } = await openaiChat({
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens,
      responseFormat: { type: 'json_object' },
      userId,
      feature,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      }],
    })
    return content || '{}'
  }

  throw new Error('Brak aktywnego dostawcy Vision (skonfiguruj GEMINI_API_KEY lub OPENAI_API_KEY)')
}

export async function parseNutritionLabel(imageBase64: string, mimeType: string, userId?: string) {
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new Error('Unsupported image type')
  if (!imageBase64 || imageBase64.length > 8_000_000) throw new Error('Image is missing or too large')
  const content = await callVisionLlm({
    prompt: `Odczytaj etykietę żywieniową. Zwróć wyłącznie JSON z wartościami na 100 g lub 100 ml: {"name":string,"brand":string|null,"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number|null,"sugar":number|null,"servingGrams":number|null,"confidence":"high"|"medium"|"low"}. Nie przeliczaj porcji na 100 g, jeśli na zdjęciu brakuje podstawy przeliczenia. Wtedy ustaw confidence="low" i brakujące pola null.`,
    imageBase64,
    mimeType,
    userId,
    feature: 'nutrition-label-ocr',
    maxTokens: 500,
  })
  const raw = JSON.parse(content || '{}') as Record<string, unknown>
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
) {
  validateMealImage(imageBase64, mimeType)
  const prompt = `Przeanalizuj zdjęcie całego posiłku. Zwróć wyłącznie JSON: {"items":[{"id":string,"name":string,"grams":number,"minGrams":number,"maxGrams":number,"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number|null,"sugar":number|null,"confidence":"high"|"medium"|"low","assumptions":string[],"questions":[{"id":string,"prompt":string,"impactKcal":number,"options":[{"id":string,"label":string,"grams":number|null,"calories":number|null,"protein":number|null,"carbs":number|null,"fat":number|null,"fiber":number|null,"sugar":number|null}]}]}]}. Makra dotyczą całej oszacowanej porcji, nie 100 g. Każda opcja odpowiedzi ma zawierać skorygowane gramy, kalorie i makra całego składnika po wybraniu tej opcji. Rozdziel widoczne składniki. Uwzględnij możliwy olej, sos i ukryte dodatki, ale nie udawaj pomiaru: podaj realistyczny zakres minGrams/maxGrams. Pytania twórz tylko wtedy, gdy odpowiedź może istotnie zmienić kalorie; maksymalnie 3 kandydatów na składnik. Krótkie etykiety i pytania po polsku. Kontekst użytkownika: ${ctx.profileLine}. Najczęstsze wybory: ${ctx.historyBlock || 'brak'}.`
  const content = await callVisionLlm({
    prompt,
    imageBase64,
    mimeType,
    userId,
    feature: 'nutrition-meal-photo',
    maxTokens: 1800,
  })
  const draft = normalizeMealPhotoResponse(JSON.parse(content || '{}'))
  const textApiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('OPENAI_API_KEY') || ''
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
