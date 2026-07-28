import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { isPlausibleFoodCandidate, mergeUserFoodCandidates } from './reconcile.ts'

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
