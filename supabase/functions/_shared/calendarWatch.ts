/**
 * calendarWatch.ts — Rejestracja i odnowienie Google Calendar push notifications.
 * Google pinga `calendar-watch` (z tokenem w URL) przy każdej zmianie w kalendarzu.
 * Kanał wygasa po max ~30 dniach; stąd renewal cron co tydzień (bezpieczny zapas).
 */
import { safeExecute, createServiceClient } from './supabase.ts'
import { getGoogleAccessToken } from './googleToken.ts'

const WATCH_TTL_MS = 25 * 24 * 60 * 60 * 1000 // 25 dni (limit Google: 30)

function calendarWatchUrl(token: string): string {
  const base = Deno.env.get('SUPABASE_URL') ?? ''
  return `${base}/functions/v1/calendar-watch?token=${token}`
}

export async function ensureCalendarWatch(userId: string, accessToken?: string | null): Promise<boolean> {
  const supabase = createServiceClient()

  const existing = await safeExecute(
    supabase
      .from('vanguard_calendar_watch')
      .select('expiration')
      .eq('user_id', userId)
      .maybeSingle()
  )
  // Kanał jeszcze żyje (zapas >3 dni) — nic nie rób.
  if (existing?.expiration && new Date(existing.expiration).getTime() - Date.now() > 3 * 24 * 60 * 60 * 1000) {
    return true
  }

  const token = accessToken ?? (await getGoogleAccessToken(userId))
  if (!token) {
    console.warn('[calendarWatch] No access token — cannot register watch for', userId)
    return false
  }

  const channelId = crypto.randomUUID()
  const webhookToken = crypto.randomUUID()
  const expiration = Date.now() + WATCH_TTL_MS

  const watchRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
    signal: AbortSignal.timeout(15000),
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: channelId,
      type: 'webhook',
      address: calendarWatchUrl(webhookToken),
      expiration,
    }),
  })

  if (!watchRes.ok) {
    const errBody = await watchRes.text().catch(() => '')
    console.error('[calendarWatch] Google watch registration failed:', watchRes.status, errBody.substring(0, 200))
    return false
  }

  const watch = await watchRes.json()
  await safeExecute(
    supabase.from('vanguard_calendar_watch').upsert({
      user_id: userId,
      channel_id: channelId,
      token: webhookToken,
      resource_id: watch.resourceId ?? null,
      expiration: new Date(expiration).toISOString(),
      updated_at: new Date().toISOString(),
    })
  )
  console.log('[calendarWatch] Watch registered for', userId, 'expires', new Date(expiration).toISOString())
  return true
}

/** Odnawia kanały zbliżające się do wygaśnięcia. Zwraca liczbę odnowionych. */
export async function renewExpiringWatches(): Promise<number> {
  const supabase = createServiceClient()
  const soon = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
  const rows = await safeExecute(
    supabase.from('vanguard_calendar_watch').select('user_id').lt('expiration', soon)
  )
  if (!rows?.length) return 0
  let renewed = 0
  for (const row of rows) {
    // Wymuś rejestrację: usuń stary wiersz, żeby ensure nie uznał kanału za żywy.
    await safeExecute(supabase.from('vanguard_calendar_watch').delete().eq('user_id', row.user_id))
    if (await ensureCalendarWatch(row.user_id)) renewed += 1
  }
  return renewed
}
