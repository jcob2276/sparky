import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { normalizeGramOnlyItems } from './normalize.ts'
import { recoverUnitCountFromText } from './matching.ts'

Deno.test('normalizer preserves explicit gram metadata', () => {
  const [item] = normalizeGramOnlyItems({
    items: [{
      name: 'Twaróg',
      quantity: 150,
      unit: 'g',
      grams: 150,
      explicitGrams: true,
      confidence: 'high',
    }],
  })

  assertEquals(item.grams, 150)
  assertEquals(item.parseMeta?.quantity, 150)
  assertEquals(item.parseMeta?.unit, 'g')
  assertEquals(item.parseMeta?.explicitGrams, true)
})

Deno.test('normalizer preserves bowls as a unit instead of treating count as grams', () => {
  const [item] = normalizeGramOnlyItems({
    items: [{
      name: 'Rosół z makaronem',
      quantity: 2,
      unit: 'miska',
      grams: 600,
      explicitGrams: false,
      confidence: 'medium',
    }],
  })

  assertEquals(item.grams, 600)
  assertEquals(item.parseMeta?.quantity, 2)
  assertEquals(item.parseMeta?.unit, 'bowl')
  assertEquals(item.parseMeta?.explicitGrams, false)
})

Deno.test('normalizer repairs bowl count returned in the grams field', () => {
  const [item] = normalizeGramOnlyItems({
    items: [{
      name: 'Rosół z makaronem',
      quantity: 2,
      unit: 'miski',
      grams: 2,
      explicitGrams: false,
      confidence: 'medium',
    }],
  })

  assertEquals(item.grams, 600)
  assertEquals(item.parseMeta?.unit, 'bowl')
  assertEquals(item.assumptions?.some((a) => a.includes('300g')), true)
})

Deno.test('text recovery supplies a missing bowl quantity', () => {
  const [item] = recoverUnitCountFromText('2 miski rosołu z makaronem', [{
    name: 'Rosół z makaronem',
    grams: 2,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    confidence: 'medium',
    source: 'llm',
    parseMeta: {
      macroSource: 'llm_estimate',
      parserVersion: 'test',
      unit: 'bowl',
      explicitGrams: false,
    },
  }])

  assertEquals(item.grams, 600)
  assertEquals(item.parseMeta?.quantity, 2)
})
