
const ARCHIVE_LAG_DAYS = 6
const HOURLY = 'relative_humidity_2m'
const DAILY = 'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration'

interface OpenMeteoDaily {
  daily?: {
    time?: string[]
    temperature_2m_mean?: (number | null)[]
    temperature_2m_max?: (number | null)[]
    temperature_2m_min?: (number | null)[]
    precipitation_sum?: (number | null)[]
    sunshine_duration?: (number | null)[]
  }
  hourly?: { time?: string[]; relative_humidity_2m?: (number | null)[] }
}

export interface WeatherDailyRow {
  user_id: string
  date: string
  temp_mean: number | null
  temp_max: number | null
  temp_min: number | null
  humidity_mean: number | null
  precip_mm: number | null
  sunshine_h: number | null
}

const num = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const round1 = (v: number | null): number | null => (v == null ? null : Math.round(v * 10) / 10)

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Pure: odpowiedz Open-Meteo => wiersze weather_daily (wilgotnosc = srednia z godzin doby). */
export function parseWeatherDaily(userId: string, payload: OpenMeteoDaily): WeatherDailyRow[] {
  const humidityByDay = new Map<string, number[]>()
  const hours = payload.hourly?.time ?? []
  hours.forEach((iso, i) => {
    const h = num(payload.hourly?.relative_humidity_2m?.[i])
    if (h == null) return
    const day = iso.slice(0, 10)
    humidityByDay.set(day, [...(humidityByDay.get(day) ?? []), h])
  })
  const d = payload.daily
  return (d?.time ?? []).map((date, i) => {
    const hum = humidityByDay.get(date)
    const sunshine = num(d?.sunshine_duration?.[i])
    return {
      user_id: userId,
      date,
      temp_mean: round1(num(d?.temperature_2m_mean?.[i])),
      temp_max: round1(num(d?.temperature_2m_max?.[i])),
      temp_min: round1(num(d?.temperature_2m_min?.[i])),
      humidity_mean: hum && hum.length >= 12 ? round1(hum.reduce((s, v) => s + v, 0) / hum.length) : null,
      precip_mm: round1(num(d?.precipitation_sum?.[i])),
      sunshine_h: sunshine == null ? null : round1(sunshine / 3600),
    }
  })
}

async function fetchRange(url: string): Promise<OpenMeteoDaily> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  return await res.json()
}

/**
 * Uzupelnia weather_daily dla lokalizacji domu. Pomija prace, gdy wczorajszy dzien jest juz zapisany.
 * Blad pogody jest nieszkodliwy dla korelacji (brak serii), wiec nigdy nie rzuca.
 */
// deno-lint-ignore no-explicit-any
export async function syncWeatherDaily(supabase: any, userId: string, start: string, today: string): Promise<void> {
  try {
    const yesterday = shiftDay(today, -1)
    const { data: last } = await supabase.from('weather_daily').select('date').eq('user_id', userId)
      .order('date', { ascending: false }).limit(1).maybeSingle()
    if (last?.date && last.date >= yesterday) return

    const { data: home } = await supabase.from('user_settings').select('home_lat, home_lng').eq('user_id', userId).maybeSingle()
    if (home?.home_lat == null || home?.home_lng == null) return

    const base = `latitude=${Number(home.home_lat)}&longitude=${Number(home.home_lng)}&daily=${DAILY}&hourly=${HOURLY}&timezone=Europe%2FWarsaw`
    const archiveEnd = shiftDay(today, -ARCHIVE_LAG_DAYS)
    const [archive, recent] = await Promise.all([
      archiveEnd >= start
        ? fetchRange(`https://archive-api.open-meteo.com/v1/archive?${base}&start_date=${start}&end_date=${archiveEnd}`)
        : Promise.resolve({} as OpenMeteoDaily),
      fetchRange(`https://api.open-meteo.com/v1/forecast?${base}&past_days=10&forecast_days=1`),
    ])
    const byDate = new Map<string, WeatherDailyRow>()
    for (const row of [...parseWeatherDaily(userId, archive), ...parseWeatherDaily(userId, recent)]) {
      if (row.date >= start && row.date < today) byDate.set(row.date, row)
    }
    const rows = [...byDate.values()]
    if (rows.length === 0) return
    const { error } = await supabase.from('weather_daily').upsert(rows, { onConflict: 'user_id,date' })
    if (error) console.warn('[weatherSync] upsert failed:', error.message)
  } catch (err) {
    console.warn('[weatherSync] skipped:', err instanceof Error ? err.message : err)
  }
}
