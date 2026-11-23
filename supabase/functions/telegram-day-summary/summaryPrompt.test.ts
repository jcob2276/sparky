import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildSummaryUserPrompt, normalizeBullets } from './summaryPrompt.ts'

Deno.test('prompt zawiera godzinę, rodzaj wiadomości i traktuje treść jako dane', () => {
  const prompt = buildSummaryUserPrompt([
    { content: '  Spokojny   dzień ', timestamp: '2026-11-23T18:05:00+00:00', voiceSeconds: 42 },
    { content: 'Kupić mleko', timestamp: '2026-11-23T19:10:00+00:00', voiceSeconds: 0 },
  ])
  assertStringIncludes(prompt, '[18:05] (głosówka) Spokojny dzień')
  assertStringIncludes(prompt, '[19:10] (wiadomość) Kupić mleko')
  assertStringIncludes(prompt, '<<<')
})

Deno.test('normalizeBullets odrzuca śmieci i przycina listę', () => {
  assertEquals(normalizeBullets(null), null)
  assertEquals(normalizeBullets({ bullets: 'nie lista' }), null)
  assertEquals(normalizeBullets({ bullets: ['', 3, '  Punkt  '] }), ['Punkt'])
  assertEquals(normalizeBullets({ bullets: Array.from({ length: 10 }, (_, i) => `p${i}`) })?.length, 6)
})
