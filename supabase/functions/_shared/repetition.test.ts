import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { FRESH_QUESTIONS, detectRepetition, pickFreshQuestion, repetitionMessage, similarity } from './repetition.ts'

const SAME = 'Dzisiaj znowu odkładałem rozmowy sprzedażowe, wolałem kodować i analizować zamiast dzwonić do klientów, czułem opór i zmęczenie po nocy'
const SAME_B = 'Znowu odkładałem rozmowy sprzedażowe, wolałem analizować i kodować zamiast dzwonić do klientów, czułem opór i zmęczenie po nocy'
const OTHER = 'Wieczorem poszedłem na długi spacer z babcią, zjedliśmy obiad razem, potem czytałem książkę o inwestowaniu do późna w kuchni'

Deno.test('similarity is high for the same reflection reworded and low for a different day', () => {
  assertEquals(similarity(SAME, SAME_B) > 0.6, true)
  assertEquals(similarity(SAME, OTHER) < 0.2, true)
})

Deno.test('two similar past entries raise the alarm, one different entry does not', () => {
  const alarm = detectRepetition(SAME, [
    { date: '2026-10-22', text: SAME_B },
    { date: '2026-10-21', text: SAME_B },
    { date: '2026-10-20', text: OTHER },
  ])
  assertEquals(alarm.repeated, true)
  assertEquals(alarm.matches, 2)
  assertEquals(detectRepetition(SAME, [{ date: '2026-10-22', text: OTHER }]).repeated, false)
})

Deno.test('one almost identical entry is enough, short entries are never compared', () => {
  assertEquals(detectRepetition(SAME, [{ date: '2026-10-22', text: SAME }]).repeated, true)
  assertEquals(detectRepetition('Było ok.', [{ date: '2026-10-22', text: SAME }]).repeated, false)
})

Deno.test('the fresh question rotates by day and the message names the matches', () => {
  assertEquals(FRESH_QUESTIONS.includes(pickFreshQuestion('2026-10-24')), true)
  assertEquals(pickFreshQuestion('2026-10-24') === pickFreshQuestion('2026-10-25'), false)
  const text = repetitionMessage({ repeated: true, matches: 2, best: { date: '2026-10-22', similarity: 0.7 }, compared: 5 }, '2026-10-24')
  assertEquals(text.includes('22.10'), true)
  assertEquals(text.includes('70%'), true)
})
