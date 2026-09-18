/**
 * @function calendar-write
 * @trigger HTTP POST / Frontend / manual
 * @role Zapis/aktualizacja wydarzeń w kalendarzu Google oraz bazy danych vanguard_calendar.
 * @reads vanguard_tokens, vanguard_calendar
 * @writes vanguard_calendar
 * @calls googleapis.com/calendar
 * @consumer Kalendarz Google użytkownika
 * @status active
 */
import { safeExecute, createServiceClient } from '../_shared/supabase.ts'
import { serveJson } from '../_shared/http.ts'
import { getGoogleAccessToken } from '../_shared/googleToken.ts'

function gcalTimePayload(isoStart: string, isoEnd: string, allDay: boolean) {
  if (allDay) {
    // Wydarzenia całodniowe w GCal używają wyłącznie daty; koniec jest ekskluzywny.
    return { start: { date: isoStart.slice(0, 10) }, end: { date: isoEnd.slice(0, 10) } }
  }
  return {
    start: { dateTime: isoStart, timeZone: 'Europe/Warsaw' },
    end: { dateTime: isoEnd, timeZone: 'Europe/Warsaw' },
  }
}

function gcalRemindersPayload(reminderMinutes: number | null | undefined) {
  if (reminderMinutes == null) return null
  return { useDefault: false, overrides: [{ method: 'popup', minutes: reminderMinutes }] }
}

Deno.serve(serveJson(async (req, ctx) => {  try {
    const body = await req.clone().json()
    const { action, event, deleteScope } = body

    const userId = ctx.userId
    if (!userId || !action) throw new Error('Missing userId or action')

  if (!['create', 'update', 'delete'].includes(action)) throw new Error('Unknown calendar action')
  if (!event || typeof event !== 'object') throw new Error('Missing calendar event')

  if (action !== 'delete') {
    const start = Date.parse(event.start)
    const end = Date.parse(event.end)
    if (!String(event.summary || '').trim()) throw new Error('Event summary is required')
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Invalid event time range')
    if (event.recurrence != null && (!Array.isArray(event.recurrence) || event.recurrence.some((rule: unknown) => typeof rule !== 'string' || !rule.startsWith('RRULE:')))) {
      throw new Error('Invalid event recurrence')
    }
    if (event.location != null && typeof event.location !== 'string') throw new Error('Invalid event location')
    if (event.is_all_day != null && typeof event.is_all_day !== 'boolean') throw new Error('Invalid is_all_day flag')
    if (event.reminder_minutes != null && (!Number.isInteger(event.reminder_minutes) || event.reminder_minutes < 0)) {
      throw new Error('Invalid reminder_minutes')
    }
  }

  const access_token = await getGoogleAccessToken(userId)
  const supabase = createServiceClient()

  const gcalBase = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
  const headers = access_token
    ? {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      }
    : null

  if (action === 'create') {
    let createdId = event.id || `vanguard-${crypto.randomUUID()}`
    let gcalError: string | null = null

    if (!access_token) {
      console.warn('[calendar-write] No Google access_token — skipping GCal push')
      gcalError = 'no_google_token'
    } else {
      try {
        const gcalRes = await fetch(gcalBase, {
          signal: AbortSignal.timeout(15000),
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: event.summary,
            description: event.description ?? '',
            ...(event.location ? { location: event.location } : {}),
            ...gcalTimePayload(event.start, event.end, event.is_all_day === true),
            ...(event.recurrence?.length ? { recurrence: event.recurrence } : {}),
            ...(gcalRemindersPayload(event.reminder_minutes)
              ? { reminders: gcalRemindersPayload(event.reminder_minutes) }
              : {}),
          }),
        })
        if (gcalRes.ok) {
          const created = await gcalRes.json()
          createdId = created.id ?? createdId
          console.log('[calendar-write] GCal event created:', createdId)
        } else {
          const errText = await gcalRes.text().catch(() => '')
          gcalError = `gcal_${gcalRes.status}: ${errText.substring(0, 200)}`
          console.error('[calendar-write] GCal create failed:', gcalError)
        }
      } catch (gcalErr) {
        gcalError = String(gcalErr)
        console.error('[calendar-write] GCal create exception:', gcalErr)
      }
    }

    // Upsert into local vanguard_calendar
    await safeExecute(
      supabase.from('vanguard_calendar').upsert({
        user_id: userId,
        event_id: createdId,
        summary: event.summary,
        start_time: event.start,
        end_time: event.end,
        description: event.description ?? null,
        recurrence: event.recurrence ?? null,
        series_id: null,
        category: event.category ?? 'vanguard',
        location: event.location ?? null,
        is_all_day: event.is_all_day ?? false,
        reminder_minutes: event.reminder_minutes ?? null,
      }, { onConflict: 'event_id' })
    )
    return { success: true, eventId: createdId, gcalError }
  }

  if (action === 'update') {
    if (!event.id) throw new Error('Missing event.id for update')

    let returnedId = event.id
    let gcalRecurrence: string[] | null = event.recurrence ?? null

    if (headers) {
      try {
        const getRes = await fetch(`${gcalBase}/${event.id}`, {
          signal: AbortSignal.timeout(10000),
          method: 'GET',
          headers,
        })
        if (getRes.ok) {
          const existing = await getRes.json()
          const putBody: Record<string, unknown> = {
            ...existing,
            summary: event.summary,
            description: event.description ?? existing.description ?? '',
            location: event.location ?? existing.location ?? '',
            ...gcalTimePayload(event.start, event.end, event.is_all_day === true),
          }

          if (event.recurrence?.length) {
            putBody.recurrence = event.recurrence
          } else if (event.recurrence === null) {
            delete putBody.recurrence
          }

          const reminders = gcalRemindersPayload(event.reminder_minutes)
          if (reminders) {
            putBody.reminders = reminders
          }

          const gcalRes = await fetch(`${gcalBase}/${event.id}`, {
            signal: AbortSignal.timeout(15000),
            method: 'PUT',
            headers,
            body: JSON.stringify(putBody),
          })
          if (gcalRes.ok) {
            const updated = await gcalRes.json()
            returnedId = updated.id ?? event.id
            gcalRecurrence = updated.recurrence ?? gcalRecurrence
          }
        }
      } catch (gcalErr) {
        console.warn('GCal update skipped:', gcalErr)
      }
    }

    // Update the local row in vanguard_calendar
    if (returnedId !== event.id) {
      await safeExecute(
        supabase.from('vanguard_calendar').delete()
          .eq('user_id', userId).eq('event_id', event.id)
      )
    }
    await safeExecute(
      supabase.from('vanguard_calendar').upsert({
        user_id: userId,
        event_id: returnedId,
        summary: event.summary,
        start_time: event.start,
        end_time: event.end,
        description: event.description ?? null,
        recurrence: gcalRecurrence,
        series_id: null,
        category: event.category ?? 'vanguard',
        location: event.location ?? null,
        is_all_day: event.is_all_day ?? false,
        reminder_minutes: event.reminder_minutes ?? null,
      }, { onConflict: 'event_id' })
    )
    return { success: true, eventId: returnedId }
  }

  if (action === 'delete') {
    if (!event.id) throw new Error('Missing event.id for delete')

    const baseId = event.id.includes('_') ? event.id.split('_')[0] : event.id
    const targetGcalId = deleteScope === 'all' ? baseId : event.id

    if (headers) {
      try {
        const delRes = await fetch(`${gcalBase}/${targetGcalId}`, {
          signal: AbortSignal.timeout(15000),
          method: 'DELETE',
          headers,
        })
        if (!delRes.ok && delRes.status !== 404 && delRes.status !== 410) {
          console.warn(`GCal delete for ${targetGcalId} returned status ${delRes.status}`)
        }
      } catch (gcalErr) {
        console.warn('GCal delete skipped:', gcalErr)
      }

      // If deleting all, also make sure the instance itself is cleaned up in GCal if it had an exception
      if (deleteScope === 'all' && event.id !== baseId) {
        try {
          await fetch(`${gcalBase}/${event.id}`, {
            signal: AbortSignal.timeout(10000),
            method: 'DELETE',
            headers,
          })
        } catch (_) {
          // ignore
        }
      }
    }

    await safeExecute(
      supabase
        .from('vanguard_calendar')
        .delete()
        .eq('user_id', userId)
        .or(`event_id.eq.${event.id},id.eq.${event.id}`)
    )

    if (deleteScope === 'all') {
      await safeExecute(
        supabase
          .from('vanguard_calendar')
          .delete()
          .eq('user_id', userId)
          .or(`event_id.eq.${baseId},id.eq.${baseId},series_id.eq.${baseId},series_id.eq.${event.id},event_id.like.${baseId}_%`)
      )
    }

    return { success: true }
  }

  throw new Error(`Unknown action: ${action}`)
  } catch (err: any) {
    console.error('calendar-write error:', err)
    throw new Error(err.message || String(err))
  }
}))

