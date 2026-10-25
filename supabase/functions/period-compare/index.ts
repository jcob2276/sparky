/**
 * @function period-compare
 * @trigger HTTP POST / Frontend (Kronika → Porównanie AI)
 * @role Porównanie dwóch wybranych okresów (np. tydzień vs tydzień): sen, jedzenie, trening, sprzedaż, oceny dnia, zadania, opinie i dziennik z Telegrama; zwraca podsumowanie, co się poprawiło/pogorszyło, 3 zmiany i różnice w dzienniku.
 * @reads daily_wins, daily_reconciliations, oura_daily_summary, daily_nutrition, workout_sessions, strava_activities_clean, closer_daily_logs, vanguard_stream
 * @writes —
 * @calls deepseek-chat
 * @consumer Karta „Porównanie AI” w Kronice
 * @status active
 */
import { RUN_SPORT_TYPES, SAUNA_WORKOUT_DAY_PATTERN } from '@vanguard/domain'
import { serveJson, HttpError } from '../_shared/http.ts'
import { deepseekChat, parseJsonFromContent } from '../_shared/deepseek.ts'
import { LLM_TASKS } from '../_shared/llm/tasks.ts'
import { buildPeriodFacts, type PeriodRows } from './periodCompareCore.ts'
import { COMPARE_SYSTEM_PROMPT, buildCompareUserPrompt, normalizeCompare, type FoodTargets } from './periodComparePrompt.ts'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_SPAN_DAYS = 400

interface PeriodInput { label: string; start: string; end: string }

function parsePeriod(raw: unknown, name: string): PeriodInput {
  const row = (raw ?? {}) as Record<string, unknown>
  const start = typeof row.start === 'string' ? row.start : ''
  const end = typeof row.end === 'string' ? row.end : ''
  if (!DATE.test(start) || !DATE.test(end) || start > end) throw new HttpError(400, `Niepoprawny okres ${name}.`)
  const span = (new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000
  if (span > MAX_SPAN_DAYS) throw new HttpError(400, `Okres ${name} jest za długi.`)
  return { label: typeof row.label === 'string' && row.label.trim() ? row.label.trim().slice(0, 40) : `${start}–${end}`, start, end }
}

Deno.serve(serveJson(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const a = parsePeriod(body.a, 'A')
  const b = parsePeriod(body.b, 'B')
  const userId = ctx.userId
  if (!userId) throw new HttpError(400, 'userId required')
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || ''
  if (!apiKey) throw new HttpError(500, 'Analiza AI nie jest skonfigurowana.')

  const db = ctx.supabase
  const gather = async (period: PeriodInput): Promise<PeriodRows> => {
    const { start, end } = period
    const [wins, scores, oura, nutrition, workouts, runs, closer, journal] = await Promise.all([
      db.from('daily_wins')
        .select('date, day_note, task_1, task_2, task_3, task_4, task_5, category_1, category_2, category_3, category_4, category_5, done_1, done_2, done_3, done_4, done_5')
        .eq('user_id', userId).gte('date', start).lte('date', end),
      db.from('daily_reconciliations').select('date, day_score').eq('user_id', userId).gte('date', start).lte('date', end),
      db.from('oura_daily_summary').select('date, total_sleep_hours, sleep_score, hrv_avg, rhr_avg, readiness_score, bedtime_timestamp, bedtime_end_timestamp, latency_minutes, deep_sleep_hours, rem_sleep_hours, sleep_efficiency').eq('user_id', userId).gte('date', start).lte('date', end),
      db.from('daily_nutrition').select('date, calories, protein, fiber, avg_food_quality').eq('user_id', userId).gte('date', start).lte('date', end),
      db.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('date', start).lte('date', end).not('workout_day', 'ilike', SAUNA_WORKOUT_DAY_PATTERN),
      db.from('strava_activities_clean').select('distance').eq('user_id', userId).eq('is_oura', false).in('sport_type', [...RUN_SPORT_TYPES])
        .gte('start_date', `${start}T00:00:00Z`).lte('start_date', `${end}T23:59:59Z`),
      db.from('closer_daily_logs').select('dials, appointments, sales_calls, sales_closed').eq('user_id', userId).gte('date', start).lte('date', end),
      db.from('vanguard_stream').select('timestamp, content').eq('user_id', userId).eq('source', 'telegram')
        .gte('timestamp', `${start}T00:00:00Z`).lte('timestamp', `${end}T23:59:59Z`).order('timestamp', { ascending: true }).limit(200),
    ])
    if (wins.error) throw wins.error
    return {
      wins: wins.data ?? [],
      scores: scores.data ?? [],
      oura: oura.data ?? [],
      nutrition: nutrition.data ?? [],
      workoutSessions: workouts.count ?? 0,
      runDistancesM: (runs.data ?? []).map((r: { distance: number | null }) => r.distance),
      closer: closer.data ?? [],
      journal: journal.data ?? [],
    }
  }

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date())
  const [rowsA, rowsB, targetsRes, syncRes] = await Promise.all([
    gather(a),
    gather(b),
    db.from('nutrition_targets').select('target_kcal, protein_floor_g').eq('user_id', userId).order('date', { ascending: false }).limit(1),
    db.from('strava_activities').select('synced_at').eq('user_id', userId).order('synced_at', { ascending: false }).limit(1),
  ])
  const targetRow = (targetsRes.data ?? [])[0] as { target_kcal: number | null; protein_floor_g: number | null } | undefined
  const targets: FoodTargets = { kcal: targetRow?.target_kcal ?? null, protein: targetRow?.protein_floor_g ?? null }
  const stravaSyncedAt = ((syncRes.data ?? [])[0] as { synced_at: string | null } | undefined)?.synced_at ?? null
  const factsA = buildPeriodFacts(a.label, a.start, a.end, rowsA, today, stravaSyncedAt)
  const factsB = buildPeriodFacts(b.label, b.start, b.end, rowsB, today, stravaSyncedAt)

  const { content } = await deepseekChat({
    apiKey,
    ...LLM_TASKS.structured,
    maxTokens: 1800,
    temperature: 0.3,
    userId,
    feature: 'period-compare',
    messages: [
      { role: 'system', content: COMPARE_SYSTEM_PROMPT },
      { role: 'user', content: buildCompareUserPrompt(factsA, factsB, targets) },
    ],
  })

  const comparison = normalizeCompare(parseJsonFromContent(content))
  if (!comparison) throw new HttpError(502, 'Model zwrócił nieczytelne porównanie. Spróbuj ponownie.')

  return {
    comparison,
    generatedAt: new Date().toISOString(),
    basedOn: {
      scoredDays: [factsA.scoredDays, factsB.scoredDays],
      journalEntries: [factsA.journal.length, factsB.journal.length],
    },
  }
}))
