import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildMealPhotoPrompt } from './mealPhotoPrompt.ts'

const ctx = { profileLine: 'Profil', historyBlock: '', correctionsBlock: '- "sernik" → 100g jako "sernik baskijski"' }

Deno.test('meal photo prompt carries past corrections and the user hint', () => {
  const prompt = buildMealPhotoPrompt(ctx, 'to sernik baskijski\n i kawa latte')
  assertStringIncludes(prompt, 'sernik baskijski')
  assertStringIncludes(prompt, 'Użytkownik poprawia rozpoznanie: "to sernik baskijski i kawa latte"')
  assertStringIncludes(prompt, 'Wcześniejsze poprawki')
})

Deno.test('meal photo prompt without a hint has no correction sentence and caps a long hint', () => {
  assertEquals(buildMealPhotoPrompt(ctx).includes('Użytkownik poprawia rozpoznanie'), false)
  const long = buildMealPhotoPrompt(ctx, 'x'.repeat(2000))
  assertEquals(long.includes('x'.repeat(501)), false)
})
