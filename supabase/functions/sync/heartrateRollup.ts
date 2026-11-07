// Jeden formatter na cały proces: tworzenie Intl.DateTimeFormat per próbka (toLocaleDateString z timeZone)
// zjadało limit CPU funkcji Edge przy kilkudziesięciu tysiącach próbek.
const WARSAW_DAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' })
const warsawDay = (iso: string) => WARSAW_DAY.format(new Date(iso))

const round1 = (n: number) => Math.round(n * 10) / 10

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

/** Minimalna liczba próbek, żeby doba miała wiarygodną średnią (Oura daje próbkę co ~5 min). */
const MIN_SAMPLES_PER_DAY = 12

/**
 * Dzienne agregaty tętna (doba Europe/Warsaw): średnia i p90 z próbek poza snem oraz średnia z próbek
 * `rest`. Pierwszą dobę okna (zawsze niepełną) pomijamy, a gdy okno kończy się w przeszłości
 * (`windowEndDate`), także ostatnią — żeby częściowy dzień nie nadpisał kompletnego.
 */
export function rollupDailyHeartrate(
  userId: string,
  rows: { ts: string; bpm: number; source: string | null }[],
  windowStartDate: string,
  windowEndDate: string | null = null,
): Array<Record<string, unknown>> {
  const byDay = new Map<string, { all: number[]; rest: number[] }>()
  for (const r of rows) {
    if (r.source === 'sleep') continue
    const day = warsawDay(r.ts)
    if (day <= windowStartDate || (windowEndDate !== null && day >= windowEndDate)) continue
    const bucket = byDay.get(day) ?? { all: [], rest: [] }
    bucket.all.push(r.bpm)
    if (r.source === 'rest') bucket.rest.push(r.bpm)
    byDay.set(day, bucket)
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  return [...byDay.entries()].filter(([, b]) => b.all.length >= MIN_SAMPLES_PER_DAY).map(([date, b]) => {
    const sorted = [...b.all].sort((x, y) => x - y)
    return {
      user_id: userId,
      date,
      day_avg_bpm: round1(mean(b.all)),
      day_p90_bpm: round1(percentile(sorted, 0.9)),
      day_rest_bpm: b.rest.length ? round1(mean(b.rest)) : null,
      samples: b.all.length,
      updated_at: new Date().toISOString(),
    }
  })
}
