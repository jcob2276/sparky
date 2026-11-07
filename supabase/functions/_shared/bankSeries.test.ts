import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildMetricSeries } from './correlationSeries.ts'

const base = {
  todayWarsaw: '2026-11-07', strainRows: [], ouraRows: [], ouraEnhRows: [], nutrRows: [], aggregateRows: [],
  frictionRows: [], foodRows: [], workoutRows: [], winsRows: [], reconRows: [], behaviorRows: [],
  supplementRows: [], stravaRows: [], awRows: [], bodyRows: [],
}

Deno.test('wydatki z banku: sumy dzienne, zero w dniach bez obciążeń, bez przelewów własnych i inwestycji', () => {
  const series = buildMetricSeries({
    ...base,
    bankRows: [
      { booking_date: '2026-11-01', amount: -30, category: 'zakupy_spozywcze' },
      { booking_date: '2026-11-01', amount: '-20.5', category: 'jedzenie_na_miescie' },
      { booking_date: '2026-11-01', amount: -1295, category: 'przelewy_wlasne' },
      { booking_date: '2026-11-01', amount: -500, category: 'inwestycje' },
      { booking_date: '2026-11-03', amount: -10, category: 'transport' },
    ],
  })
  assertEquals(series.spend_total.map((p) => [p.day, p.value]), [['2026-11-01', 50.5], ['2026-11-02', 0], ['2026-11-03', 10]])
  assertEquals(series.spend_food.map((p) => p.value), [50.5, 0, 0])
  assertEquals(series.spend_eating_out.map((p) => p.value), [20.5, 0, 0])
})

Deno.test('brak transakcji nie tworzy serii wydatków', () => {
  const series = buildMetricSeries({ ...base, bankRows: [] })
  assertEquals(series.spend_total.length, 0)
})
