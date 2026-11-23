/**
 * @function telegram-day-summary
 * @trigger HTTP POST / Frontend (Domknięcie dnia)
 * @role Streszcza wiadomości i głosówki z Telegrama z jednego dnia w kilka punktów; wynik jest w cache, dopóki nie dojdą nowe wiadomości.
 * @reads vanguard_stream, telegram_day_summaries
 * @writes telegram_day_summaries
 * @calls deepseek-chat
 * @consumer Karta „Z Telegrama dziś” w domknięciu dnia
 * @status active
 */
import { serveJson, HttpError } from '../_shared/http.ts'
import { deepseekChat, parseJsonFromContent } from '../_shared/deepseek.ts'
import { LLM_TASKS } from '../_shared/llm/tasks.ts'
import { getWarsawDayBoundaries } from '@vanguard/domain'
import { SUMMARY_SYSTEM_PROMPT, buildSummaryUserPrompt, normalizeBullets, type TelegramEntry } from './summaryPrompt.ts'

const MAX_ROWS = 80

Deno.serve(serveJson(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const date = typeof body.date === 'string' ? body.date : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) throw new HttpError(400, 'Brak poprawnej daty.')
  const userId = ctx.userId
  if (!userId) throw new HttpError(400, 'userId required')

  const { start, end } = getWarsawDayBoundaries(date)
  const { data, error } = await ctx.supabase
    .from('vanguard_stream')
    .select('content, timestamp, metadata')
    .eq('user_id', userId).eq('source', 'telegram')
    .gte('timestamp', start).lt('timestamp', end)
    .order('timestamp', { ascending: true })
    .limit(MAX_ROWS)
  if (error) throw error

  const entries: TelegramEntry[] = (data ?? []).flatMap((row) => {
    const content = typeof row.content === 'string' ? row.content.trim() : ''
    if (!content || !row.timestamp) return []
    const seconds = Number((row.metadata as Record<string, unknown> | null)?.voice_duration_seconds)
    return [{ content, timestamp: row.timestamp, voiceSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0 }]
  })
  if (entries.length === 0) return { bullets: null, messageCount: 0, voiceSeconds: 0 }

  const voiceSeconds = entries.reduce((sum, e) => sum + e.voiceSeconds, 0)
  const lastMessageAt = entries[entries.length - 1].timestamp
  const { data: cached } = await ctx.supabase
    .from('telegram_day_summaries').select('bullets, message_count, last_message_at')
    .eq('user_id', userId).eq('date', date).maybeSingle()
  const cachedBullets = Array.isArray(cached?.bullets) ? cached.bullets.filter((b): b is string => typeof b === 'string') : null
  if (cached && cachedBullets?.length && cached.message_count === entries.length && Date.parse(cached.last_message_at) === Date.parse(lastMessageAt)) {
    return { bullets: cachedBullets, messageCount: entries.length, voiceSeconds }
  }

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || ''
  if (!apiKey) throw new HttpError(500, 'Podsumowanie AI nie jest skonfigurowane.')
  const { content } = await deepseekChat({
    apiKey,
    ...LLM_TASKS.structured,
    maxTokens: 700,
    temperature: 0.3,
    userId,
    feature: 'telegram-day-summary',
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: buildSummaryUserPrompt(entries) },
    ],
  })
  const bullets = normalizeBullets(parseJsonFromContent(content))
  if (!bullets) throw new HttpError(502, 'Model zwrócił nieczytelne podsumowanie. Spróbuj ponownie.')

  await ctx.supabase.from('telegram_day_summaries').upsert({
    user_id: userId, date, bullets, message_count: entries.length, voice_seconds: voiceSeconds,
    last_message_at: lastMessageAt, generated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' })

  return { bullets, messageCount: entries.length, voiceSeconds }
}))
