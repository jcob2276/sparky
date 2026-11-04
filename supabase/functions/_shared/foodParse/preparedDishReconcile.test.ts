import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { reconcileItems } from './reconcile.ts'
import type { ParsedFoodItem } from '../foodParseCore.ts'

const dryTacos = { name: 'Tacos', calories: 518, protein: 5.8, carbs: 61.5, fat: 27.6, source: 'logged' }
const photoItem = (name: string): ParsedFoodItem => ({
  name, grams: 320, calories: 764, protein: 48, carbs: 80, fat: 28,
  confidence: 'medium', source: 'llm',
  parseMeta: { macroSource: 'llm_estimate', parserVersion: 'meal-photo-v1' },
})

Deno.test('filled tacos keep the photo estimate instead of taking dry packaged OFF macros', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => Promise.resolve(Response.json({ hits: [{
    product_name: 'Tacos', nutriments: {
      'energy-kcal_100g': 518, proteins_100g: 5.8, carbohydrates_100g: 61.5, fat_100g: 27.6,
    },
  }] }))
  try {
    for (const name of ['Taco', 'Tacos', 'Tacosy', 'Tacosów', 'Tacos z wołowiną', 'Tacos z sosem', 'Tacos z nachos']) {
      const [out] = await reconcileItems([photoItem(name)], { supabaseUrl: '', serviceKey: '' })
      assertEquals(out.calories, 764, name)
      assertEquals(out.parseMeta?.macroSource, 'llm_estimate', name)
    }
  } finally { globalThis.fetch = originalFetch }
})

Deno.test('a dry high-density library entry cannot poison later filled taco estimates', async () => {
  const db = createClient('https://example.supabase.co', 'test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: input => Promise.resolve(Response.json(
      (input instanceof Request ? input.url : String(input)).includes('food_favorites') ? [] : [dryTacos],
    )) },
  })
  const [out] = await reconcileItems([photoItem('Tacos')], { supabaseUrl: '', serviceKey: '', userId: 'owner', db })
  assertEquals(out.calories, 764)
  assertEquals(out.protein, 48)
  assertEquals(out.parseMeta?.macroSource, 'llm_estimate')
})

Deno.test('filled tacos can still use a plausible matching library recipe', async () => {
  const db = createClient('https://example.supabase.co', 'test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: input => Promise.resolve(Response.json(
      (input instanceof Request ? input.url : String(input)).includes('food_favorites') ? [] : [{ name: 'Tacos', calories: 250, protein: 15, carbs: 25, fat: 10 }],
    )) },
  })
  const [out] = await reconcileItems([photoItem('Tacos')], { supabaseUrl: '', serviceKey: '', userId: 'owner', db })
  assertEquals(out.calories, 800)
  assertEquals(out.parseMeta?.macroSource, 'library')
})

Deno.test('a singular dish still matches its plural reference name', async () => {
  const [out] = await reconcileItems([photoItem('Naleśnik z serem')], { supabaseUrl: '', serviceKey: '' })
  assertEquals(out.name, 'Naleśniki z serem')
  assertEquals(out.calories, 557)
  assertEquals(out.parseMeta?.macroSource, 'reference_pl')
})

Deno.test('explicit taco shells still use packaged product nutrition', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => Promise.resolve(Response.json({ hits: [{
    product_name: 'Taco shells', nutriments: {
      'energy-kcal_100g': 518, proteins_100g: 5.8, carbohydrates_100g: 61.5, fat_100g: 27.6,
    },
  }] }))
  try {
    const [out] = await reconcileItems([photoItem('Taco shells')], { supabaseUrl: '', serviceKey: '' })
    assertEquals(out.calories, 1658)
    assertEquals(out.parseMeta?.macroSource, 'off')
  } finally { globalThis.fetch = originalFetch }
})
