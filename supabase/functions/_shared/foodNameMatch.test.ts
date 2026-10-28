import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { scoreFoodNameMatch } from './foodGeneric.ts'

Deno.test('składnik nie dopasowuje się do potrawy, w której występuje', () => {
  assertEquals(scoreFoodNameMatch('pomidor', 'Zupa pomidorowa'), 0)
  assertEquals(scoreFoodNameMatch('pomidory', 'Sok pomidorowy'), 0)
  assertEquals(scoreFoodNameMatch('jabłko', 'Szarlotka ciasto z jabłkami'), 0)
})

Deno.test('prośba o potrawę nadal ją znajduje', () => {
  assertEquals(scoreFoodNameMatch('zupa pomidorowa', 'Zupa pomidorowa') > 0.9, true)
  assertEquals(scoreFoodNameMatch('pomidor', 'Pomidory') > 0.9, true)
})
