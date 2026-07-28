import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import type { ParsedFoodItem } from '../foodParseCore.ts'
import { validateParsedItems } from './semanticValidation.ts'

function item(overrides: Partial<ParsedFoodItem>): ParsedFoodItem {
  return {
    name: 'Produkt',
    grams: 100,
    calories: 200,
    protein: 10,
    carbs: 20,
    fat: 8,
    confidence: 'high',
    source: 'library',
    parseMeta: {
      macroSource: 'library',
      parserVersion: 'test',
      matchScore: 1,
    },
    ...overrides,
  }
}

Deno.test('soup portion of 2 g is never high confidence', () => {
  const [result] = validateParsedItems([
    item({
      name: 'Rosół z makaronem',
      grams: 2,
      calories: 2,
      protein: 0,
      carbs: 0.3,
      fat: 0.1,
      parseMeta: {
        macroSource: 'library',
        parserVersion: 'test',
        matchScore: 1,
        dataSource: 'yazio_import',
        quantity: 2,
        unit: 'bowl',
        explicitGrams: false,
      },
    }),
  ], '2 miski rosołu z makaronem')

  assertEquals(result.grams, 600)
  assertEquals(result.calories, 600)
  assertEquals(result.confidence, 'medium')
  assertEquals(result.parseMeta?.validationStatus, 'review')
  assertStringIncludes(result.assumptions?.join(' ') ?? '', 'misk')
})

Deno.test('unverified imported bread with implausible density requires review', () => {
  const [result] = validateParsedItems([
    item({
      name: 'Bułka pszenna',
      grams: 50,
      calories: 53,
      protein: 2.5,
      carbs: 5,
      fat: 2.5,
      parseMeta: {
        macroSource: 'library',
        parserVersion: 'test',
        matchScore: 1,
        dataSource: 'yazio_import',
      },
    }),
  ], 'bułka pszenna 50g')

  assertEquals(result.confidence, 'low')
  assertStringIncludes(result.parseMeta?.warnings?.join(' ') ?? '', 'gęstość')
})

Deno.test('low-score library match cannot be marked high confidence', () => {
  const [result] = validateParsedItems([
    item({
      name: 'Ciastko weselne biszkoptowe z serem',
      grams: 82,
      calories: 287,
      parseMeta: {
        macroSource: 'library',
        parserVersion: 'test',
        matchScore: 0.57,
        dataSource: 'yazio_import',
      },
    }),
  ], 'ciastko weselne z jabłkami')

  assertEquals(result.confidence, 'low')
  assertStringIncludes(result.parseMeta?.warnings?.join(' ') ?? '', 'dopasowanie')
})

Deno.test('credible reference food remains high confidence', () => {
  const [result] = validateParsedItems([
    item({
      name: 'Kotlet mielony smażony',
      grams: 150,
      calories: 375,
      protein: 24,
      carbs: 7.5,
      fat: 27,
      source: 'database',
      parseMeta: {
        macroSource: 'reference_pl',
        parserVersion: 'test',
        matchScore: 1,
        dataSource: 'reference_pl',
      },
    }),
  ], 'kotlet mielony 150g')

  assertEquals(result.confidence, 'high')
  assertEquals(result.parseMeta?.validationStatus, 'accepted')
})
