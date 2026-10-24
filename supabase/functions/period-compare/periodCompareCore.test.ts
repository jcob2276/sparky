import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { COMPARE_SYSTEM_PROMPT, buildCompareUserPrompt, buildPeriodFacts, normalizeCompare, warsawDay, type PeriodRows } from './periodCompareCore.ts'

const empty: PeriodRows = { wins: [], scores: [], oura: [], nutrition: [], workoutSessions: 0, runDistancesM: [], closer: [], journal: [] }

Deno.test('facts aggregate tasks by category, averages ignore missing days, runs convert to km', () => {
  const f = buildPeriodFacts('19–25 paź', '2026-10-19', '2026-10-25', {
    ...empty,
    wins: [{ date: '2026-10-19', day_note: ' spoko ', task_1: 'Trening', category_1: 'cialo', done_1: true, task_2: 'Dykcja', category_2: 'duch', done_2: false }],
    scores: [{ date: '2026-10-19', day_score: 6 }, { date: '2026-10-20', day_score: 4 }, { date: '2026-10-21', day_score: null }],
    oura: [{ total_sleep_hours: 7, sleep_score: 80, hrv_avg: null, rhr_avg: 52, readiness_score: null }, { total_sleep_hours: 6, sleep_score: null, hrv_avg: null, rhr_avg: null, readiness_score: null }],
    runDistancesM: [10000, 5500, null],
    closer: [{ dials: 10, appointments: 3, sales_calls: 1, sales_closed: 0 }, { dials: 15, appointments: 2, sales_calls: 2, sales_closed: 1 }],
    journal: [{ timestamp: '2026-10-23T22:30:00Z', content: 'wpis' }, { timestamp: null, content: 'bez daty' }],
  }, '2026-10-26')
  assertEquals(f.scoreAvg, 5)
  assertEquals(f.scoredDays, 2)
  assertEquals(f.tasks, { done: 1, planned: 2, byCategory: { cialo: { done: 1, planned: 1 }, duch: { done: 0, planned: 1 } } })
  assertEquals(f.notes, [{ date: '2026-10-19', text: 'spoko' }])
  assertEquals(f.sleep, { hours: 6.5, score: 80, hrv: null, rhr: 52, readiness: null })
  assertEquals(f.training.runKm, 15.5)
  assertEquals(f.sales, { entries: 2, calls: 25, booked: 5, salesCalls: 3, sold: 1 })
  assertEquals(f.journal, [{ date: '2026-10-24', text: 'wpis' }])
  assertEquals(f.days, 7)
})

Deno.test('prompt names both periods and says "brak" for missing data instead of zero', () => {
  const a = buildPeriodFacts('A', '2026-10-19', '2026-10-25', empty, '2026-10-26')
  const b = buildPeriodFacts('B', '2026-10-12', '2026-10-18', empty, '2026-10-26')
  const prompt = buildCompareUserPrompt(a, b)
  assertStringIncludes(prompt, 'OKRES A (wybrany): A (2026-10-19 do 2026-10-25, 7 dni)')
  assertStringIncludes(prompt, 'OKRES B (punkt odniesienia): B')
  assertStringIncludes(prompt, 'Sen: brak, jakość brak')
})

Deno.test('normalize keeps at most three well-formed items per list and rejects a reply without a summary', () => {
  const r = normalizeCompare({
    summary: ' Lepszy sen. ',
    improved: [{ title: 'Sen', evidence: '7,2 h vs 6,4 h' }, { title: 'bez dowodu' }],
    worsened: [],
    changes: [{ title: 'A', why: 'x', how: 'y' }, { title: 'B', why: 'x', how: 'y' }, { title: 'C', why: 'x', how: 'y' }, { title: 'D', why: 'x', how: 'y' }],
    journal: [{ title: 'Ton', evidence: '„lepiej”' }],
  })
  assertEquals(r?.summary, 'Lepszy sen.')
  assertEquals(r?.improved.length, 1)
  assertEquals(r?.changes.length, 3)
  assertEquals(normalizeCompare({ improved: [] }), null)
  assertEquals(warsawDay('2026-10-23T22:30:00Z'), '2026-10-24')
})

Deno.test('a period with no sales entries is described as missing data, not as zero', () => {
  const a = buildPeriodFacts('A', '2026-10-19', '2026-10-25', { ...empty, closer: [{ dials: 10, appointments: 3, sales_calls: 1, sales_closed: 0 }] }, '2026-10-26')
  const b = buildPeriodFacts('B', '2026-10-05', '2026-10-11', empty, '2026-10-26')
  const prompt = buildCompareUserPrompt(a, b)
  assertStringIncludes(prompt, 'Sprzedaż (z 1 dni z wpisem): rozmowy odebrane 10')
  assertStringIncludes(prompt, 'Sprzedaż: brak wpisów z tego okresu (to brak danych, NIE zero)')
})

Deno.test('the system prompt keeps past events from becoming to-dos and forbids invented circumstances', () => {
  assertStringIncludes(COMPARE_SYSTEM_PROMPT, 'nie jest zadaniem na przyszłość')
  assertStringIncludes(COMPARE_SYSTEM_PROMPT, 'Nie dodawaj okoliczności, których nie ma w danych')
})

Deno.test('food averages use only finished days with logged calories, keep a real 0 fiber day, and ignore today', () => {
  const nutrition = [
    { date: '2026-10-19', calories: 2530, protein: 153.1, fiber: 7, avg_food_quality: 42 },
    { date: '2026-10-21', calories: 1737, protein: 59.4, fiber: 0, avg_food_quality: 32 },
    { date: '2026-10-22', calories: 0, protein: 0, fiber: 0, avg_food_quality: null },
    { date: '2026-10-24', calories: 531, protein: 17.2, fiber: 3.1, avg_food_quality: 38 },
  ]
  const f = buildPeriodFacts('A', '2026-10-19', '2026-10-25', { ...empty, nutrition }, '2026-10-24')
  assertEquals(f.food, { days: 2, kcal: 2133.5, protein: 106.3, fiber: 3.5, quality: 37 })
})

Deno.test('prompt states the nutrition targets and warns that fiber is a lower bound', () => {
  const a = buildPeriodFacts('A', '2026-10-19', '2026-10-25', empty, '2026-10-26')
  const b = buildPeriodFacts('B', '2026-10-12', '2026-10-18', empty, '2026-10-26')
  const prompt = buildCompareUserPrompt(a, b, { kcal: 2428, protein: 155 })
  assertStringIncludes(prompt, 'Cele żywieniowe użytkownika: 2428 kcal/dzień, białko co najmniej 155 g/dzień')
  assertStringIncludes(prompt, 'błonnik (dolna granica)')
  assertStringIncludes(COMPARE_SYSTEM_PROMPT, 'Błonnik w danych to dolna granica')
})

