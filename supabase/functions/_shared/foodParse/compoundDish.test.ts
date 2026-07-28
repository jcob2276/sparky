import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { shouldExpandCompoundDish } from './reconcile.ts'

Deno.test('compound dish names are not split merely because they contain z', () => {
  assertEquals(shouldExpandCompoundDish('ciastko z jabłkami 100g'), false)
  assertEquals(shouldExpandCompoundDish('naleśniki z serem 300g'), false)
  assertEquals(shouldExpandCompoundDish('rosół z makaronem 2 miski'), false)
})

Deno.test('explicit ingredient enumeration can enable compound recovery', () => {
  assertEquals(shouldExpandCompoundDish('kurczak 150g + ryż 200g'), true)
  assertEquals(shouldExpandCompoundDish('kurczak 150g, ryż 200g'), true)
})
