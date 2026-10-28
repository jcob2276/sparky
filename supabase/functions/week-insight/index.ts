/**
 * @function week-insight
 * @trigger HTTP POST / Frontend (Tydzień → Analiza AI)
 * @role Analiza ostatnich 7 dni: plan 5 zadań, oceny i opinie dnia oraz dziennik głosowy z Telegrama; zwraca podsumowanie, 3 konkretne zmiany i powtarzające się wzorce.
 * @reads daily_wins, daily_win_tasks, daily_reconciliations, vanguard_stream
 * @writes —
 * @calls deepseek-chat
 * @consumer Karta „Analiza AI” w zakładce Tydzień
 * @status active
 */
import { serveJson, HttpError } from '../_shared/http.ts'
import { deepseekChat, parseJsonFromContent } from '../_shared/deepseek.ts'
import { LLM_TASKS } from '../_shared/llm/tasks.ts'
import { DAILY_WIN_TASK_COLUMNS, withLegacySlots } from '../_shared/dailyWinTasks.ts'
import {
  WEEK_INSIGHT_SYSTEM_PROMPT,
  buildWeekInsightUserPrompt,
  normalizeWeekInsight,
  type WeekInsightDay,
  type WeekInsightFacts,
} from './weekInsightPrompt.ts'

const DAYS = 7
const MAX_JOURNAL_ENTRIES = 30
const WEEKDAY_PL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function weekday(date: string): string {
  return WEEKDAY_PL[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? ''
}

Deno.serve(serveJson(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const today = typeof body.today === 'string' ? body.today : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new HttpError(400, 'Brak poprawnej daty (today).')
  const userId = ctx.userId
  if (!userId) throw new HttpError(400, 'userId required')

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || ''
  if (!apiKey) throw new HttpError(500, 'Analiza AI nie jest skonfigurowana.')

  const from = shiftDate(today, -(DAYS - 1))
  const [winsRes, scoresRes, journalRes] = await Promise.all([
    ctx.supabase
      .from('daily_wins')
      .select(`date, day_note, daily_win_tasks(${DAILY_WIN_TASK_COLUMNS})`)
      .eq('user_id', userId).gte('date', from).lte('date', today),
    ctx.supabase
      .from('daily_reconciliations')
      .select('date, day_score')
      .eq('user_id', userId).gte('date', from).lte('date', today),
    ctx.supabase
      .from('vanguard_stream')
      .select('content, timestamp')
      .eq('user_id', userId).eq('source', 'telegram')
      .gte('timestamp', `${from}T00:00:00`)
      .order('timestamp', { ascending: true })
      .limit(MAX_JOURNAL_ENTRIES),
  ])
  if (winsRes.error) throw winsRes.error

  const winsByDate = new Map<string, Record<string, unknown>>((winsRes.data ?? []).map(withLegacySlots).map(r => [String(r.date), r]))
  const scoreByDate = new Map<string, number | null>((scoresRes.data ?? []).map((r: { date: string; day_score: number | null }) => [r.date, r.day_score]))

  const days: WeekInsightDay[] = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = shiftDate(today, -i)
    const row = winsByDate.get(date)
    const tasks = [1, 2, 3, 4, 5].flatMap((n) => {
      const title = row?.[`task_${n}`]
      return typeof title === 'string' && title.trim()
        ? [{ title: title.trim(), done: Boolean(row?.[`done_${n}`]), category: (row?.[`category_${n}`] as string | null) ?? null }]
        : []
    })
    days.push({
      date,
      weekday: weekday(date),
      score: scoreByDate.get(date) ?? null,
      note: typeof row?.day_note === 'string' && row.day_note.trim() ? row.day_note.trim() : null,
      tasks,
    })
  }

  const journal = (journalRes.data ?? [])
    .filter((r: { content: string | null }) => typeof r.content === 'string' && r.content.trim())
    .map((r: { content: string; timestamp: string }) => ({ date: r.timestamp.slice(0, 10), text: r.content }))

  const facts: WeekInsightFacts = { days, journal }
  const { content } = await deepseekChat({
    apiKey,
    ...LLM_TASKS.structured,
    maxTokens: 1500,
    temperature: 0.3,
    userId,
    feature: 'week-insight',
    messages: [
      { role: 'system', content: WEEK_INSIGHT_SYSTEM_PROMPT },
      { role: 'user', content: buildWeekInsightUserPrompt(facts) },
    ],
  })

  const insight = normalizeWeekInsight(parseJsonFromContent(content))
  if (!insight) throw new HttpError(502, 'Model zwrócił nieczytelną analizę. Spróbuj ponownie.')

  return {
    insight,
    generatedAt: new Date().toISOString(),
    basedOn: { days: days.filter((d) => d.tasks.length > 0 || d.score != null).length, journalEntries: journal.length },
  }
}))
