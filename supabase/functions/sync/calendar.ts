import { safeExecute, createServiceClient, resolveUserScope } from '../_shared/supabase.ts'
import { fetchWithRetry } from '../_shared/httpClient.ts'
import { ensureCalendarWatch } from '../_shared/calendarWatch.ts'

export async function runCalendarSync(req: Request): Promise<unknown> {
    const body = await req.json().catch(() => ({}))
    const { code, redirectUri } = body
    const { userId } = await resolveUserScope(req, body.userId ?? null)
    if (!userId) throw new Error('Missing userId for calendar sync')
    const supabase = createServiceClient()

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

    // 1. OAUTH EXCHANGE
    if (code) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { signal: AbortSignal.timeout(15000),
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      })

      const tokens = await tokenResponse.json()
      if (!tokenResponse.ok || tokens.error) {
        throw new Error(`Google OAuth error: ${tokens.error_description || tokens.error || tokenResponse.status}`)
      }
      // OAuth token upsert (nie rzucamy błędem — to opcjonalna operacja)
      if (tokens.refresh_token) {
        await safeExecute(
          supabase.from('vanguard_tokens').upsert({
            user_id: userId,
            provider: 'google',
            refresh_token: tokens.refresh_token
          })
        )
      }
      // Świeży token = dobry moment na rejestrację push notifications (webhook).
      // access_token z code exchange jest od razu dostępny — bez dodatkowego refreshu.
      await ensureCalendarWatch(userId, tokens.access_token ?? null).catch((err) => {
        console.warn('[sync-calendar] watch registration after OAuth failed:', err)
      })
      return { success: true }
    }

    // 2. FETCH TOKEN
    const tokenData = await safeExecute(
      supabase
        .from('vanguard_tokens')
        .select('refresh_token')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle()
    )

    if (!tokenData) {
      return { ok: true, skipped: true, reason: 'calendar_not_configured' }
    }

    // Google's token endpoint occasionally 500s transiently (seen 2026-07-15) — plain fetch
    // had zero retry, so every cron-driven calendar sync failed outright on that blip.
    const refreshRes = await fetchWithRetry('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokenData.refresh_token,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token'
      })
    }, { timeoutMs: 15000, retries: 2, retryStatusCodes: [429, 500, 502, 503, 504], logTag: 'google.tokenRefresh' })

    if (!refreshRes.ok) {
      const errBody = await refreshRes.text().catch(() => '')
      // 400 invalid_grant = refresh token revoked/expired — jedyną naprawą jest ponowna
      // autoryzacja w UI. Zwracamy strukturalny reason zamiast rzucać, żeby frontend
      // mógł pokazać przycisk "Połącz ponownie" zamiast cichego 500.
      if (refreshRes.status === 400 && errBody.includes('invalid_grant')) {
        console.warn('[sync-calendar] Google refresh token invalid (invalid_grant) — re-auth required')
        return { ok: false, skipped: true, reason: 'google_token_invalid' }
      }
      throw new Error(`Google token refresh failed: ${refreshRes.status} — ${errBody.substring(0, 200)}`)
    }
    const { access_token } = await refreshRes.json()

    // Helper to get Warsaw offset (e.g. "+02:00" or "+01:00") dynamically
    const getWarsawOffset = (date: Date): string => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Warsaw',
        timeZoneName: 'longOffset'
      }).formatToParts(date);
      const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+2';
      const cleanOffset = offsetPart.replace('GMT', '');
      if (cleanOffset === 'Z') return '+00:00';
      if (!cleanOffset.includes(':')) {
        const sign = cleanOffset[0];
        const val = cleanOffset.substring(1).padStart(2, '0');
        return `${sign}${val}:00`;
      }
      return cleanOffset;
    };

    // 3. SYNC CALENDAR (INTENTIONS)
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('sv', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Find Monday of the current week in Warsaw time context.
    const warsawTodayStr = formatter.format(now);
    const currentDay = new Date(warsawTodayStr + 'T12:00:00').getDay();
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(warsawTodayStr + 'T12:00:00');
    monday.setDate(monday.getDate() + daysToMonday);
    // Okno szersze niż 2 tygodnie: widok miesiąca w UI pokazuje ~-15/+45 dni,
    // więc syncuje -1 tydzień -> +6 tygodni, żeby poza oknem nie było dziur.
    const windowStart = new Date(monday);
    windowStart.setDate(monday.getDate() - 7);
    const windowEnd = new Date(monday);
    windowEnd.setDate(monday.getDate() + 41);
    const warsawWindowStartStr = formatter.format(windowStart);
    const warsawWindowEndStr = formatter.format(windowEnd);

    // Each boundary uses its OWN date's offset, not `now`'s
    const startOfWindowStr = new Date(`${warsawWindowStartStr}T00:00:00${getWarsawOffset(windowStart)}`).toISOString()
    const endOfWindowStr = new Date(`${warsawWindowEndStr}T23:59:59.999${getWarsawOffset(windowEnd)}`).toISOString()

    const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfWindowStr}&timeMax=${endOfWindowStr}&singleEvents=true&orderBy=startTime`, { signal: AbortSignal.timeout(15000),
      headers: { 'Authorization': `Bearer ${access_token}` }
    })
    if (!calRes.ok) {
      const errBody = await calRes.text().catch(() => '');
      throw new Error(`[sync-calendar] Calendar API error ${calRes.status}: ${errBody.substring(0, 200)}`);
    }
    const calData = await calRes.json()
    const recurringIds = [...new Set((calData.items || [])
      .map((event: any) => event.recurringEventId)
      .filter(Boolean))] as string[]
    const recurrenceBySeries = new Map<string, string[]>()
    await Promise.all(recurringIds.map(async (seriesId) => {
      const seriesRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${seriesId}`, {
        signal: AbortSignal.timeout(10000),
        headers: { 'Authorization': `Bearer ${access_token}` },
      })
      if (!seriesRes.ok) return
      const series = await seriesRes.json()
      if (series.recurrence?.length) recurrenceBySeries.set(seriesId, series.recurrence)
    }))
    const calendarEvents = (calData.items || []).map((e: any) => ({
      user_id: userId,
      event_id: e.id,
      summary: e.summary,
      start_time: e.start.dateTime || e.start.date,
      end_time: e.end.dateTime || e.end.date,
      description: e.description ?? null,
      recurrence: e.recurrence ?? recurrenceBySeries.get(e.recurringEventId) ?? null,
      series_id: e.recurringEventId ?? null,
      category: 'google_sync',
      location: e.location ?? null,
      is_all_day: Boolean(e.start.date && !e.start.dateTime),
      reminder_minutes: (e.reminders?.overrides || [])
        .filter((o: any) => o.method === 'popup' && Number.isInteger(o.minutes))
        .map((o: any) => o.minutes)
        .sort((a: number, b: number) => a - b)[0] ?? null,
    }))

    // Atomic delete+upsert via RPC
    await safeExecute(
      supabase.rpc('replace_calendar_window', {
        p_user_id: userId,
        p_category: 'google_sync',
        p_start: startOfWindowStr,
        p_end: endOfWindowStr,
        p_events: calendarEvents,
      })
    )

    // Bezpiecznik dwukierunkowości: upewnij się, że kanał push notifications żyje
    // (rejestracja po OAuth mogła się nie powieść; kanał mógł wygasnąć).
    await ensureCalendarWatch(userId, access_token).catch((err) => {
      console.warn('[sync-calendar] watch ensure after sync failed:', err)
    })

    return {
      success: true,
      calendarCount: calendarEvents.length
    }
}