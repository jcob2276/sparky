/**
 * @function calendar-watch
 * @trigger HTTP — webhook od Google Calendar push notifications + cron renewal.
 * @reads vanguard_calendar_watch, vanguard_tokens
 * @writes vanguard_calendar (przez uruchomienie sync)
 * @consumer Dwukierunkowa synchronizacja Google <-> Vanguard
 * @status active
 *
 * Google pinga ten endpoint przy KAŻDEJ zmianie w kalendarzu użytkownika
 * (tworzenie/edycja/usunięcie wydarzenia — także z innych urządzeń).
 * Ping zawiera `?token=<uuid>` dopasowywany do vanguard_calendar_watch.
 */
import { serveJson } from '../_shared/http.ts'
import { safeExecute, createServiceClient } from '../_shared/supabase.ts'
import { ensureCalendarWatch, renewExpiringWatches } from '../_shared/calendarWatch.ts'
import { runCalendarSync } from '../sync/calendar.ts'

async function handleWebhook(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return new Response('missing token', { status: 401 })

  const supabase = createServiceClient()
  const watch = await safeExecute(
    supabase.from('vanguard_calendar_watch').select('user_id').eq('token', token).maybeSingle()
  )
  if (!watch?.user_id) return new Response('unknown channel', { status: 404 })

  const resourceState = req.headers.get('x-goog-resource-state') || ''
  // 'sync' = powiadomienie inicjalizacyjne kanału — nie ma jeszcze zmian do pobrania.
  if (resourceState === 'sync') return new Response('ok', { status: 200 })

  console.log('[calendar-watch] Change ping from Google for user', watch.user_id, 'state:', resourceState)
  // Synchronny sync przed odpowiedzią: EdgeRuntime.waitUntil nie utrzymuje
  // funkcji po odpowiedzi HTTP, więc praca musi się zakończyć przed 200.
  // resolveUserScope wymaga Bearer — wstrzykujemy service role klucz serwera.
  const secretKey = Deno.env.get('SB_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  await runCalendarSync(
    new Request(req.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: watch.user_id }),
    })
  )
  return new Response('ok', { status: 200 })
}

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url)

  // Ścieżka webhooka (ping od Google) — bez JWT, autoryzacja tokenem w URL.
  if (url.searchParams.has('token')) {
    return handleWebhook(req)
  }

  // Ścieżka zarządzania (rejestracja / renew-all) — przez serveJson z auth service.
  return serveJson(
    async (_req, ctx) => {
      const body = await _req.json().catch(() => ({}))
      const action = body.action

      if (action === 'renew-all') {
        if (!ctx.isServiceRole) throw new Error('Forbidden: service role required')
        const renewed = await renewExpiringWatches()
        return { ok: true, renewed }
      }

      if (action === 'register') {
        const userId = ctx.userId ?? body.userId ?? null
        if (!userId) throw new Error('Missing userId')
        const ok = await ensureCalendarWatch(userId)
        return { ok }
      }

      throw new Error(`Unknown action: ${action}`)
    },
    { auth: 'service' }
  )(req)
})
