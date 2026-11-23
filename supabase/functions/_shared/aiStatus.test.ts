import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { classifyAiError, noteTextProviderFailure, takeTextProviderFailure } from './aiStatus.ts'

Deno.test('classifyAiError rozpoznaje limit, brak środków i przeciążenie', () => {
  assertEquals(classifyAiError(new Error('Gemini HTTP 429: You exceeded your current quota')), 'quota')
  assertEquals(classifyAiError(new Error('DeepSeek error (402): Insufficient Balance')), 'balance')
  assertEquals(classifyAiError(new Error('Gemini HTTP 503: high demand')), 'overload')
  assertEquals(classifyAiError(Object.assign(new Error('x'), { status: 429 })), 'quota')
  assertEquals(classifyAiError(new Error('coś innego')), 'other')
})

Deno.test('błąd głównego dostawcy tekstu jest zapamiętany tylko raz', () => {
  noteTextProviderFailure(new Error('DeepSeek error (402)'))
  assertEquals(takeTextProviderFailure(), 'balance')
  assertEquals(takeTextProviderFailure(), null)
})
