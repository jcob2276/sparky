import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import {
  applyUserCorrections,
  applyHomemadeAdjustment,
  enforceMacroMath,
  needsFoodReview,
  caloriesFromMacros,
  type ParsedFoodItem,
} from './foodParseCore.ts'
import { lookupGenericFood, scoreFoodNameMatch } from './foodGeneric.ts'
import { applyPhysiologicalGuardrails, normalizeGramOnlyItems } from './foodParse/normalize.ts'

const llmItem = (overrides: Partial<ParsedFoodItem> = {}): ParsedFoodItem => ({
  name: 'test',
  grams: 100,
  calories: 200,
  protein: 10,
  carbs: 10,
  fat: 10,
  confidence: 'medium',
  source: 'llm',
  ...overrides,
})

Deno.test('enforceMacroMath — koryguje rozjazd >15%', () => {
  const items = enforceMacroMath([llmItem({ calories: 300, protein: 10, carbs: 10, fat: 10 })])
  assertEquals(items[0].calories, caloriesFromMacros(10, 10, 10))
  assertEquals(items[0].confidence, 'low')
})

Deno.test('enforceMacroMath — ciche wyrównanie przy małym rozjazdzi', () => {
  const items = enforceMacroMath([llmItem({ calories: 168, protein: 10, carbs: 10, fat: 10 })])
  assertEquals(items[0].calories, 170)
  assertEquals(items[0].confidence, 'medium')
})

Deno.test('enforceMacroMath — nie dotyka bazy', () => {
  const items = enforceMacroMath([llmItem({ source: 'database', calories: 999, protein: 1, carbs: 1, fat: 1 })])
  assertEquals(items[0].calories, 999)
})

Deno.test('applyHomemadeAdjustment — tylko LLM', () => {
  const out = applyHomemadeAdjustment('naleśniki domowe', [
    llmItem({ source: 'database', fat: 10, calories: 200 }),
    llmItem({ fat: 10, calories: 200, sugar: 10 }),
  ])
  assertEquals(out[0].fat, 10)
  assertEquals(out[1].fat, 9.2)
})

Deno.test('applyUserCorrections — skaluje gramy i ustawia high', () => {
  const out = applyUserCorrections(
    [llmItem({ grams: 100, calories: 200, protein: 20 })],
    [{ query_name: 'test', corrected_name: null, corrected_grams: 150 }],
    'test 150g',
  )
  assertEquals(out[0].grams, 150)
  assertEquals(out[0].calories, 300)
  assertEquals(out[0].confidence, 'high')
})

Deno.test('needsFoodReview — tylko full high auto-save', () => {
  assertEquals(needsFoodReview([llmItem({ confidence: 'high' })]), false)
  assertEquals(needsFoodReview([llmItem({ confidence: 'medium' })]), true)
  assertEquals(needsFoodReview([llmItem({ confidence: 'high' }), llmItem({ confidence: 'medium' })]), true)
})

Deno.test('lookupGenericFood — wątróbka', () => {
  const hit = lookupGenericFood('wątróbka wieprzowa smażona 150g')
  assertEquals(hit?.name, 'Wątróbka wieprzowa smażona')
})

Deno.test('scoreFoodNameMatch — odrzuca słabe OFF-style false positive', () => {
  assertEquals(scoreFoodNameMatch('borówki', 'Ser topiony Borówka'), 0)
  assertEquals(scoreFoodNameMatch('borówki', 'Borówki') > 0.5, true)
})

Deno.test('guardrail nie traktuje rosołu jak soli', () => {
  const [result] = applyPhysiologicalGuardrails([llmItem({
    name: 'Rosół z makaronem',
    grams: 600,
    calories: 576,
    protein: 24,
    carbs: 60,
    fat: 24,
    confidence: 'high',
    source: 'library',
  })], '2 miski rosołu z makaronem')

  assertEquals(result.grams, 600)
  assertEquals(result.calories, 576)
  assertEquals(result.assumptions, undefined)
})

Deno.test('scoreFoodNameMatch — nie myli bułki z bułką tartą', () => {
  assertEquals(scoreFoodNameMatch('bułka pszenna', 'Bułka tarta pszenna'), 0)
  assertEquals(scoreFoodNameMatch('bułka pszenna', 'Bułka pszenna burger'), 0)
})

Deno.test('guardrail maslo orzechowe wygrywa z ogólnym maslo', () => {
  const [result] = applyPhysiologicalGuardrails([llmItem({
    name: 'Masło orzechowe 100% z kawałkami orzechów',
    grams: 80,
    calories: 480,
    protein: 20,
    carbs: 15,
    fat: 40,
    confidence: 'high',
    source: 'library',
  })], 'kanapka, masło orzechowe')

  assertEquals(result.grams, 20) // Powinno przyciąć do 20g (default dla masła orzechowego), a nie do 10g (default dla masła)
  assertEquals(result.calories, 120) // Przeskalowane proporcjonalnie
})

Deno.test('normalizeGramOnlyItems — jawnie traktuje grams: 0 jako brak danych i fallback do 100', () => {
  const result = normalizeGramOnlyItems([{ name: 'Kawa', grams: 0, confidence: 'high' }])
  assertEquals(result[0].grams, 100)
  assertEquals(result[0].assumptions?.includes('gramatura nieznana — przyjęto domyślne 100g'), true)
})
