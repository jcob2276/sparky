import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { classifyMealPhotoResponse, geminiFailureReason, readGeminiText } from './visionResponse.ts'

const reply = (parts: unknown[], finishReason = 'STOP') => ({ candidates: [{ content: { parts }, finishReason }] })

Deno.test('readGeminiText skips thought parts and joins the answer', () => {
  const result = readGeminiText(reply([
    { thought: true, text: 'Myślę o kebabie…' },
    { text: '{"items":[' },
    { text: '{"name":"Kebab"}]}' },
  ]))
  assertEquals(result.text, '{"items":[{"name":"Kebab"}]}')
  assertEquals(result.finishReason, 'STOP')
})

Deno.test('readGeminiText: the first part is no longer assumed to be the answer', () => {
  const result = readGeminiText(reply([{ thought: true, text: 'tylko myśli' }]))
  assertEquals(result.text, null)
})

Deno.test('readGeminiText tolerates garbage input', () => {
  for (const input of [null, undefined, 'x', {}, { candidates: [] }, { candidates: [{}] }]) {
    assertEquals(readGeminiText(input).text, null)
  }
})

Deno.test('readGeminiText reports a prompt block', () => {
  const result = readGeminiText({ promptFeedback: { blockReason: 'OTHER' }, candidates: [] })
  assertEquals(result.blockReason, 'OTHER')
})

Deno.test('geminiFailureReason flags truncated, blocked and empty answers', () => {
  assertEquals(geminiFailureReason(readGeminiText(reply([{ text: '{"items":[{"na' }], 'MAX_TOKENS'))), 'odpowiedź ucięta limitem tokenów')
  assertEquals(geminiFailureReason(readGeminiText({ promptFeedback: { blockReason: 'SAFETY' }, candidates: [] })), 'zablokowane (SAFETY)')
  assertEquals(geminiFailureReason(readGeminiText(reply([]))), 'pusta odpowiedź (STOP)')
  assertEquals(geminiFailureReason(readGeminiText(reply([{ text: '{"items":[]}' }]))), null)
})

Deno.test('classifyMealPhotoResponse separates empty from unreadable', () => {
  assertEquals(classifyMealPhotoResponse({ items: [{ name: 'Kebab' }] }), 'items')
  assertEquals(classifyMealPhotoResponse({ items: [] }), 'empty')
  assertEquals(classifyMealPhotoResponse({}), 'unreadable')
  assertEquals(classifyMealPhotoResponse({ items: 'nope' }), 'unreadable')
})
