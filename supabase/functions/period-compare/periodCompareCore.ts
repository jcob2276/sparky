import { HEALTH_THRESHOLDS, MIN_FULL_DAY_KCAL } from '@vanguard/domain';
/** Pure core of the AI period comparison: facts per period, the prompt, and response shaping (no Deno or DB imports). */

export interface PeriodRows {
  wins: Array<Record<string, unknown>>
  scores: Array<{ date: string; day_score: number | null }>
  oura: Array<{
    date: string
    total_sleep_hours: number | null
    sleep_score: number | null
    hrv_avg: number | null
    rhr_avg: number | null
    readiness_score: number | null
    bedtime_timestamp: string | null
    bedtime_end_timestamp: string | null
    latency_minutes: number | null
    deep_sleep_hours: number | null
    rem_sleep_hours: number | null
    sleep_efficiency: number | null
  }>
  nutrition: Array<{ date: string; calories: number | null; protein: number | null; fiber: number | null; avg_food_quality: number | null }>
  workoutSessions: number
  runDistancesM: Array<number | null>
  closer: Array<{ dials: number | null; appointments: number | null; sales_calls: number | null; sales_closed: number | null }>
  journal: Array<{ timestamp: string | null; content: string | null }>
}

interface CategoryRate { done: number; planned: number }

export interface PeriodFacts {
  label: string
  start: string
  end: string
  days: number
  scoreAvg: number | null
  scoredDays: number
  tasks: CategoryRate & { byCategory: Record<string, CategoryRate> }
  notes: Array<{ date: string; text: string }>
  sleep: {
    hours: number | null
    score: number | null
    hrv: number | null
    rhr: number | null
    readiness: number | null
    /** Średnia godzina zasypiania (czas warszawski, „HH:MM”) i rozrzut w minutach. */
    bedtime: string | null
    bedtimeSpreadMin: number | null
    wake: string | null
    /** Noce krótsze niż 6 h (data pobudki, godziny), najkrótsze najpierw. */
    shortNights: Array<{ date: string; hours: number }>
    latency: number | null
    deepHours: number | null
    remHours: number | null
    efficiency: number | null
  }
  /** Tylko pełne dni (bez dzisiejszego, z zapisanymi kaloriami); `days` = ile ich było. */
  food: { days: number; kcal: number | null; protein: number | null; fiber: number | null; quality: number | null }
  /** `stravaFresh`: Strava była niedawno synchronizowana, więc 0 km to naprawdę brak biegów. */
  training: { sessions: number; runKm: number; stravaFresh: boolean }
  /** `entries` = dni z wpisem; bez wpisów to brak danych, nie zero. */
  sales: { entries: number; calls: number; booked: number; salesCalls: number; sold: number }
  journal: Array<{ date: string; text: string }>
}

export interface CompareItem { title: string; evidence: string }
export interface CompareChange { title: string; why: string; how: string }

export interface PeriodCompareResult {
  summary: string
  improved: CompareItem[]
  worsened: CompareItem[]
  changes: CompareChange[]
  journal: CompareItem[]
}

export const MAX_ITEMS = 3
const STRAVA_FRESH_DAYS = 2
const MAX_NOTES = 7
const MAX_JOURNAL = 12
const MAX_JOURNAL_CHARS = 450

export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

/** Date in Warsaw: an entry at 00:30 belongs to the new day, not to the previous UTC day. */
export function warsawDay(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(date)
}

/** Średnia z wartości znanych, wliczając 0 (dzień bez błonnika to prawdziwe 0, brak danych to null). */
function avgKnown(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0)
  return real.length ? Math.round((real.reduce((a, b) => a + b, 0) / real.length) * 10) / 10 : null
}

/** Minuty od północy czasu warszawskiego dla znacznika czasu; null dla błędnej daty. */
function warsawMinutes(iso: string | null): number | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value)
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null
}

const clockText = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Średnia godzina zasypiania: godziny przed południem to już po północy tej samej nocy, więc dostają +24 h
 * (inaczej 23:30 i 00:30 uśredniłyby się do południa). Zwraca też rozrzut (odchylenie standardowe).
 */
export function averageBedtime(isos: Array<string | null>): { clock: string | null; spreadMin: number | null } {
  const minutes = isos.flatMap((iso) => {
    const m = warsawMinutes(iso)
    return m == null ? [] : [m < 720 ? m + 1440 : m]
  })
  if (!minutes.length) return { clock: null, spreadMin: null }
  const mean = minutes.reduce((a, b) => a + b, 0) / minutes.length
  const variance = minutes.reduce((a, b) => a + (b - mean) ** 2, 0) / minutes.length
  return { clock: clockText(mean), spreadMin: Math.round(Math.sqrt(variance)) }
}

function averageClock(isos: Array<string | null>): string | null {
  const minutes = isos.flatMap((iso) => { const m = warsawMinutes(iso); return m == null ? [] : [m] })
  return minutes.length ? clockText(minutes.reduce((a, b) => a + b, 0) / minutes.length) : null
}

function avg(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
  return real.length ? Math.round((real.reduce((a, b) => a + b, 0) / real.length) * 10) / 10 : null
}

/** Czy znacznik czasu (np. ostatniej synchronizacji) jest z ostatnich dni względem `today` (czas warszawski). */
function isRecent(iso: string | null, today: string): boolean {
  if (!iso) return false
  const day = warsawDay(iso)
  if (!day) return false
  const gap = (new Date(`${today}T12:00:00Z`).getTime() - new Date(`${day}T12:00:00Z`).getTime()) / 86400000
  return gap <= STRAVA_FRESH_DAYS
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000) + 1
}

const sum = (values: Array<number | null | undefined>) => values.reduce<number>((a, b) => a + (b ?? 0), 0)

export function buildPeriodFacts(label: string, start: string, end: string, rows: PeriodRows, today: string, stravaSyncedAt: string | null = null): PeriodFacts {
  // Dzisiejszy dzień jest w toku i zaniżałby średnie jedzenia (jak „średnia z N pełnych dni” w apce).
  const bedtime = averageBedtime(rows.oura.map((r) => r.bedtime_timestamp))
  const foodDays = rows.nutrition.filter((r) => r.date < today && (r.calories ?? 0) >= MIN_FULL_DAY_KCAL)
  const byCategory: Record<string, CategoryRate> = {}
  let done = 0
  let planned = 0
  const notes: PeriodFacts['notes'] = []
  for (const win of rows.wins) {
    for (let n = 1; n <= 5; n++) {
      const title = win[`task_${n}`]
      if (typeof title !== 'string' || !title.trim()) continue
      const category = typeof win[`category_${n}`] === 'string' && win[`category_${n}`] ? String(win[`category_${n}`]) : 'general'
      const isDone = Boolean(win[`done_${n}`])
      const entry = (byCategory[category] ??= { done: 0, planned: 0 })
      entry.planned += 1
      planned += 1
      if (isDone) { entry.done += 1; done += 1 }
    }
    const note = win.day_note
    if (typeof note === 'string' && note.trim() && typeof win.date === 'string') {
      notes.push({ date: win.date, text: clip(note, 300) })
    }
  }
  notes.sort((a, b) => a.date.localeCompare(b.date))

  const scoreValues = rows.scores.map((s) => s.day_score)
  const journal = rows.journal
    .filter((entry) => entry.content && entry.content.trim() && entry.timestamp)
    .map((entry) => ({ date: warsawDay(entry.timestamp as string), text: clip(entry.content as string, MAX_JOURNAL_CHARS) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    label, start, end, days: daysBetween(start, end),
    scoreAvg: avg(scoreValues),
    scoredDays: scoreValues.filter((v) => typeof v === 'number').length,
    tasks: { done, planned, byCategory },
    notes: notes.slice(0, MAX_NOTES),
    sleep: {
      hours: avg(rows.oura.map((r) => r.total_sleep_hours)),
      score: avg(rows.oura.map((r) => r.sleep_score)),
      hrv: avg(rows.oura.map((r) => r.hrv_avg)),
      rhr: avg(rows.oura.map((r) => r.rhr_avg)),
      readiness: avg(rows.oura.map((r) => r.readiness_score)),
      bedtime: bedtime.clock,
      bedtimeSpreadMin: bedtime.spreadMin,
      wake: averageClock(rows.oura.map((r) => r.bedtime_end_timestamp)),
      shortNights: rows.oura
        .flatMap((r) => (typeof r.total_sleep_hours === 'number' && r.total_sleep_hours > 0 && r.total_sleep_hours < HEALTH_THRESHOLDS.SLEEP_SHORT_H ? [{ date: r.date, hours: Math.round(r.total_sleep_hours * 10) / 10 }] : []))
        .sort((x, y) => x.hours - y.hours)
        .slice(0, 3),
      latency: avg(rows.oura.map((r) => r.latency_minutes)),
      deepHours: avg(rows.oura.map((r) => r.deep_sleep_hours)),
      remHours: avg(rows.oura.map((r) => r.rem_sleep_hours)),
      efficiency: avg(rows.oura.map((r) => r.sleep_efficiency)),
    },
    food: {
      days: foodDays.length,
      kcal: avgKnown(foodDays.map((r) => r.calories)),
      protein: avgKnown(foodDays.map((r) => r.protein)),
      fiber: avgKnown(foodDays.map((r) => r.fiber)),
      quality: avgKnown(foodDays.map((r) => r.avg_food_quality)),
    },
    training: { sessions: rows.workoutSessions, runKm: Math.round((sum(rows.runDistancesM) / 1000) * 10) / 10, stravaFresh: isRecent(stravaSyncedAt, today) },
    sales: {
      entries: rows.closer.length,
      calls: sum(rows.closer.map((r) => r.dials)),
      booked: sum(rows.closer.map((r) => r.appointments)),
      salesCalls: sum(rows.closer.map((r) => r.sales_calls)),
      sold: sum(rows.closer.map((r) => r.sales_closed)),
    },
    journal: journal.slice(-MAX_JOURNAL),
  }
}
