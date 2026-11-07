import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { rollupDailyHeartrate } from '../../sync/heartrateRollup.ts'

const samples = (day: string, n: number, bpm: number, source: string) =>
  Array.from({ length: n }, (_, i) => ({
    ts: `${day}T${String(8 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00+01:00`,
    bpm,
    source,
  }))

Deno.test('rollupDailyHeartrate — agreguje dobę poza snem, pomija niepełne dni i pierwszą dobę okna', () => {
  const rows = [
    ...samples('2026-11-02', 20, 70, 'awake'),
    ...samples('2026-11-02', 20, 55, 'rest'),
    ...samples('2026-11-02', 50, 48, 'sleep'),
    ...samples('2026-11-03', 5, 90, 'awake'),
    ...samples('2026-11-01', 30, 80, 'awake'),
  ]
  const out = rollupDailyHeartrate('u', rows, '2026-11-01')
  assertEquals(out.length, 1)
  assertEquals(out[0].date, '2026-11-02')
  assertEquals(out[0].samples, 40)
  assertEquals(out[0].day_avg_bpm, 62.5)
  assertEquals(out[0].day_rest_bpm, 55)
  assertEquals(out[0].day_p90_bpm, 70)
})

Deno.test('rollupDailyHeartrate — brak próbek daje pusty wynik', () => {
  assertEquals(rollupDailyHeartrate('u', [], '2026-11-01').length, 0)
})
