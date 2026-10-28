import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { isPlausibleFoodCandidate, mergeUserFoodCandidates, lookupViaLibraryRaw } from './reconcile.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.test('favorite candidates use joined catalog nutrients with both owners and catalog quarantine filter', async () => {
  const owner = 'owner', urls: URL[] = []
  const food = { name: 'Kawa', calories: 51, protein: 2.6, carbs: 4, fat: 2.7, saturated_fat: 1 }
  const db = createClient('https://example.supabase.co', 'test', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: input => {
    const url = new URL(input instanceof Request ? input.url : String(input)); urls.push(url)
    assertEquals(url.searchParams.get('user_id'), `eq.${owner}`)
    if (url.pathname.endsWith('food_favorites')) {
      assertEquals(url.searchParams.get('food_library.user_id'), `eq.${owner}`)
      assertEquals(url.searchParams.get('food_library.validation_status'), 'neq.quarantined')
      assertEquals(url.searchParams.get('food_library.name'), 'ilike.%Kawa%')
      assertEquals(url.searchParams.get('select')?.startsWith('food_library!inner('), true)
      return Promise.resolve(Response.json([{ name: 'stale', calories: 100, food_library: food }]))
    }
    return Promise.resolve(Response.json([]))
  } } })
  const result = await lookupViaLibraryRaw('Kawa', owner, db)
  assertEquals(result?.[0].name, 'Kawa'); assertEquals(result?.[0].calories, 51)
  assertEquals(result?.[0].saturatedFat, 1); assertEquals(urls.length, 2)
})

Deno.test('verified favorite wins over imported library candidate with the same name', () => {
  const merged = mergeUserFoodCandidates(
    [{
      name: 'Kawa domowa',
      calories: 51,
      protein: 2.6,
      carbs: 4,
      fat: 2.7,
    }],
    [{
      name: 'Kawa domowa',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: 'yazio_import',
    }],
  )

  assertEquals(merged[0].source, 'favorite')
  assertEquals(merged[0].calories, 51)
  assertEquals(merged[1].source, 'yazio_import')
})

Deno.test('obviously poisoned favorite candidates are rejected before matching', () => {
  assertEquals(isPlausibleFoodCandidate('bułka pszenna', {
    name: 'Bułka pszenna',
    calories: 105,
    protein: 5,
    carbs: 10,
    fat: 5,
    source: 'favorite',
  }), false)

  assertEquals(isPlausibleFoodCandidate('kebab box', {
    name: 'Kebab box',
    calories: 94,
    protein: 9,
    carbs: 1,
    fat: 6,
    source: 'favorite',
  }), false)
})

Deno.test('favorite with the 100 kcal placeholder is not a plausible candidate', () => {
  const placeholder = { name: 'YoPRO Straciatella', calories: 100, protein: 8.3, carbs: 5.4, fat: 0.5 }
  assertEquals(isPlausibleFoodCandidate('yopro', placeholder), false)
  assertEquals(isPlausibleFoodCandidate('yopro', { ...placeholder, calories: 59 }), true)
})
