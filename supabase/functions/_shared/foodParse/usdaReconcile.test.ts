import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { reconcileItems } from './reconcile.ts'
import type { ParsedFoodItem } from '../foodParseCore.ts'

const item = (nameEn: string | undefined): ParsedFoodItem => ({
  name: 'Amarantus ugotowany', grams: 200, calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 'medium', source: 'llm',
  parseMeta: { macroSource: 'llm_estimate', parserVersion: 'test', nameEn },
})

const row = (fdc_id: number, description: string, kcal: number) => ({
  fdc_id, data_type: 'sr_legacy_food', description, kcal, protein: 3.8, fat: 1.6, carbs: 18.7, fiber: 2.1, sugar: null, saturated_fat: 0.4, salt: 0.005,
})

const fakeDb = (rows: unknown[]) => ({ rpc: (_fn: string, _args: unknown) => Promise.resolve({ data: rows, error: null }) })
const opts = (rows: unknown[]) => ({ supabaseUrl: '', serviceKey: '', db: fakeDb(rows) })

Deno.test('prosty produkt z angielską nazwą dostaje makro z USDA, a polska nazwa zostaje', async () => {
  const [out] = await reconcileItems([item('Amaranth, cooked')], opts([row(1, 'Amaranth, cooked', 102)]))
  assertEquals(out.name, 'Amarantus ugotowany')
  assertEquals(out.parseMeta?.macroSource, 'usda')
  assertEquals(out.parseMeta?.dataSource, 'usda_fdc:1')
  assertEquals(out.calories, 204) // 102 kcal/100 g × 200 g
  assertEquals(out.fiber, 4.2)
})

Deno.test('surowy opis nie pasuje do zapytania o produkt gotowany', async () => {
  const [out] = await reconcileItems([item('Amaranth, cooked')], opts([row(2, 'Amaranth grain, uncooked', 371)]))
  assertEquals(out.parseMeta?.macroSource === 'usda', false)
})

Deno.test('bez nameEn krok USDA jest pomijany', async () => {
  const [out] = await reconcileItems([item(undefined)], opts([row(1, 'Amaranth, cooked', 102)]))
  assertEquals(out.parseMeta?.macroSource === 'usda', false)
})
