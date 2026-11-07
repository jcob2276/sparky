import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { EbError, isBankReadLimit } from './enableBanking.ts'

Deno.test('isBankReadLimit rozpoznaje limity odczytu banku', () => {
  assertEquals(isBankReadLimit(new EbError(429, 'ASPSP_RATE_LIMIT_EXCEEDED', 'x')), true)
  assertEquals(isBankReadLimit(new EbError(400, 'ASPSP_ERROR', 'x')), false)
  assertEquals(isBankReadLimit(new EbError(429, 'UNKNOWN', 'x')), true)
})

Deno.test('isBankReadLimit nie ukrywa prawdziwych błędów', () => {
  assertEquals(isBankReadLimit(new EbError(401, 'UNAUTHORIZED', 'x')), false)
  assertEquals(isBankReadLimit(new EbError(403, 'FORBIDDEN', 'x')), false)
  assertEquals(isBankReadLimit(new EbError(400, 'WRONG_REQUEST_PARAMETERS', 'x')), false)
  assertEquals(isBankReadLimit(new Error('boom')), false)
  assertEquals(isBankReadLimit(null), false)
})
