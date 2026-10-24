import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildWeekInsightUserPrompt, normalizeWeekInsight } from './weekInsightPrompt.ts'

Deno.test('user prompt lists ratings, done and missed tasks, opinions and the journal', () => {
  const prompt = buildWeekInsightUserPrompt({
    days: [{
      date: '2026-10-22', weekday: 'czwartek', score: 4, note: 'muszę coś zmienić',
      tasks: [{ title: 'Trening', done: true, category: 'cialo' }, { title: 'Dykcja', done: false, category: 'duch' }],
    }, { date: '2026-10-23', weekday: 'piątek', score: null, note: null, tasks: [] }],
    journal: [{ date: '2026-10-22', text: 'Brakuje   mi przekonania' }],
  })
  assertStringIncludes(prompt, '2026-10-22 (czwartek) ocena 4/10; zadania: ✓ Trening [cialo]; ✗ Dykcja [duch]; opinia: "muszę coś zmienić"')
  assertStringIncludes(prompt, '2026-10-23 (piątek) bez oceny; zadania: brak planu')
  assertStringIncludes(prompt, '[2026-10-22] Brakuje mi przekonania')
})

Deno.test('normalize keeps at most three well-formed items and drops incomplete ones', () => {
  const result = normalizeWeekInsight({
    summary: ' Słaby tydzień. ',
    changes: [
      { title: 'A', why: 'x', how: 'y' }, { title: 'B', why: 'x', how: 'y' }, { title: 'C', why: 'x', how: 'y' },
      { title: 'D', why: 'x', how: 'y' }, { title: '', why: 'x', how: 'y' },
    ],
    patterns: [{ theme: 'plan', evidence: '"brak planu"' }, { theme: 'bez dowodu' }],
  })
  assertEquals(result?.summary, 'Słaby tydzień.')
  assertEquals(result?.changes.length, 3)
  assertEquals(result?.patterns, [{ theme: 'plan', evidence: '"brak planu"' }])
})

Deno.test('normalize rejects a reply without a summary', () => {
  assertEquals(normalizeWeekInsight({ changes: [] }), null)
  assertEquals(normalizeWeekInsight(null), null)
})
