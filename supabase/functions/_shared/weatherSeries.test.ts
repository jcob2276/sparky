import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildMetricSeries, type SeriesBuildInput } from './correlationSeries.ts'
import { parseWeatherDaily } from './weatherSync.ts'

const baseInput = (): SeriesBuildInput => ({
  todayWarsaw: '2026-10-23',
  strainRows: [], ouraRows: [], ouraEnhRows: [], nutrRows: [], aggregateRows: [], frictionRows: [],
  foodRows: [], workoutRows: [], winsRows: [], reconRows: [], behaviorRows: [], supplementRows: [],
  stravaRows: [], awRows: [], habitRows: [], bodyRows: [],
})

Deno.test('parseWeatherDaily — dobowe wartosci, sloneczne sekundy na godziny, wilgotnosc ze sredniej godzinowej', () => {
  const time = Array.from({ length: 24 }, (_, h) => `2026-10-20T${String(h).padStart(2, '0')}:00`)
  const rows = parseWeatherDaily('u1', {
    daily: {
      time: ['2026-10-20'], temperature_2m_mean: [9.46], temperature_2m_max: [13], temperature_2m_min: [5],
      precipitation_sum: [2.2], sunshine_duration: [18000],
    },
    hourly: { time, relative_humidity_2m: time.map(() => 80) },
  })
  assertEquals(rows, [{
    user_id: 'u1', date: '2026-10-20', temp_mean: 9.5, temp_max: 13, temp_min: 5,
    humidity_mean: 80, precip_mm: 2.2, sunshine_h: 5,
  }])
})

Deno.test('parseWeatherDaily — za malo godzin wilgotnosci to null, nie srednia z kilku punktow', () => {
  const rows = parseWeatherDaily('u1', {
    daily: { time: ['2026-10-20'] },
    hourly: { time: ['2026-10-20T01:00', '2026-10-20T02:00'], relative_humidity_2m: [70, 90] },
  })
  assertEquals(rows[0].humidity_mean, null)
})

Deno.test('buildMetricSeries — pogoda i sygnaly telefonu; dzien bez zdarzen telefonu pomijany', () => {
  const series = buildMetricSeries({
    ...baseInput(),
    weatherRows: [{ date: '2026-10-20', temp_mean: 9.5, temp_max: 13, humidity_mean: 80, precip_mm: 0, sunshine_h: 5 }],
    deviceRows: [
      { date: '2026-10-20', event_count: 120, unlocks: 55, screen_on_min: 210, screen_after_22_min: 35, evening_lux_avg: 40, notif_per_hour: 6.5, phone_sleep_min: 400, home_wifi_min: 900, work_wifi_min: 0, headphones_min: 20 },
      { date: '2026-10-21', event_count: 0, unlocks: 0, screen_on_min: 0, screen_after_22_min: 0 },
    ],
  })
  assertEquals(series.weather_temp_mean, [{ day: '2026-10-20', value: 9.5 }])
  assertEquals(series.weather_precip_mm, [{ day: '2026-10-20', value: 0 }])
  assertEquals(series.phone_unlocks, [{ day: '2026-10-20', value: 55 }])
  assertEquals(series.screen_after_22_min, [{ day: '2026-10-20', value: 35 }])
  assertEquals(series.work_wifi_min, [{ day: '2026-10-20', value: 0 }])
})
