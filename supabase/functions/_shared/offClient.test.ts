import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { offNutrimentsPer100 } from './offClient.ts'

Deno.test('brakujące wartości OFF zostają null, a nie zerem', () => {
  const per100 = offNutrimentsPer100({ 'energy-kcal_100g': 52.4, 'proteins_100g': 0.3 })
  assertEquals(per100.calories, 52)
  assertEquals(per100.protein, 0.3)
  assertEquals(per100.carbs, null)
  assertEquals(per100.fat, null)
  assertEquals(per100.salt, null)
})

Deno.test('sól z sodu × 2,5, gdy OFF nie podaje soli', () => {
  assertEquals(offNutrimentsPer100({ 'energy-kcal_100g': 100, 'sodium_100g': 0.4 }).salt, 1)
  assertEquals(offNutrimentsPer100({ 'energy-kcal_100g': 100, 'salt_100g': 0.8, 'sodium_100g': 0.4 }).salt, 0.8)
})

Deno.test('nasycone większe niż tłuszcz to błąd bazy i traktujemy je jak brak', () => {
  assertEquals(offNutrimentsPer100({ 'fat_100g': 10, 'saturated-fat_100g': 12 }).saturatedFat, null)
  assertEquals(offNutrimentsPer100({ 'fat_100g': 10, 'saturated-fat_100g': 4 }).saturatedFat, 4)
  assertEquals(offNutrimentsPer100({ 'saturated-fat_100g': 4 }).saturatedFat, null)
})
