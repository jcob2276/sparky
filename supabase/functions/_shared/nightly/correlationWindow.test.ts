import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { clampCorrelationWindow, correlationWindowStart, fetchAllRows } from './correlationWindow.ts'

Deno.test('clampCorrelationWindow — domyślne, przycięte i zaokrąglone wartości', () => {
  assertEquals(clampCorrelationWindow(undefined), 90)
  assertEquals(clampCorrelationWindow('abc'), 90)
  assertEquals(clampCorrelationWindow(-5), 90)
  assertEquals(clampCorrelationWindow(7), 30)
  assertEquals(clampCorrelationWindow(1000), 365)
  assertEquals(clampCorrelationWindow('180'), 180)
  assertEquals(clampCorrelationWindow(120.4), 120)
})

Deno.test('correlationWindowStart — liczy dni wstecz niezależnie od końca miesiąca', () => {
  assertEquals(correlationWindowStart('2026-11-07', 90), '2026-08-09')
  assertEquals(correlationWindowStart('2026-03-01', 1), '2026-02-28')
})

Deno.test('fetchAllRows — łączy strony i kończy na niepełnej', async () => {
  const calls: Array<[number, number]> = []
  const result = await fetchAllRows<number>((from, to) => {
    calls.push([from, to])
    const size = from === 0 ? 3 : 1
    return Promise.resolve({ data: Array.from({ length: size }, (_, i) => from + i), error: null })
  }, 3)
  assertEquals(calls, [[0, 2], [3, 5]])
  assertEquals(result.data, [0, 1, 2, 3])
})

Deno.test('fetchAllRows — błąd strony zwraca dotychczasowe wiersze i błąd', async () => {
  const result = await fetchAllRows<number>((from) =>
    Promise.resolve(from === 0
      ? { data: [1, 2], error: null }
      : { data: null, error: { message: 'boom' } }), 2)
  assertEquals(result.data, [1, 2])
  assertEquals(result.error?.message, 'boom')
})
