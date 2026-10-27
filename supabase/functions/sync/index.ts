/**
 * @function sync
 * @trigger HTTP POST / manual / cron
 * @role Router synchronizacji biometrii, kalendarza i notowań na żywo (Finanse).
 * @reads oura_daily_summary, strava_activities, vanguard_calendar, user_settings, vanguard_tokens, oura_enhanced, strava_tokens, intervals_tokens, oura_heartrate, oura_sleep_hr_timeline, oura_sleep_hrv_timeline, oura_sleep_phase_timeline, vanguard_preferences, aw_daily_summary
 * @writes oura_daily_summary, strava_activities, vanguard_calendar, audit_events, oura_enhanced, oura_heartrate, oura_sleep_phase_timeline, strava_tokens, vanguard_tokens
 * @calls ouraring.com, strava.com, googleapis.com/calendar, api.telegram.org (poprzez send.ts), api.nbp.pl, query1.finance.yahoo.com
 * @consumer Dane biometryczne, treningowe i kalendarza oraz notowania w Finansach
 * @status active
 */
import { resolveUserScope } from '../_shared/supabase.ts'
import { serveJson } from '../_shared/http.ts'
import { runOuraSync } from './oura.ts'
import { runStravaSync } from './strava.ts'
import { runCalendarSync } from './calendar.ts'
import { runNextDnsSync } from './nextdns.ts'
import { runQuotesSync } from './quotes.ts'

Deno.serve(serveJson(async (req) => {
  const url = new URL(req.url)
  const body = (req.method === 'POST' || req.method === 'PUT')
    ? await req.clone().json().catch(() => ({}))
    : {}
  const userId = url.searchParams.get('userId') || body.userId

  // Check searchParams first, then fall back to body JSON if request has payload
  let service = url.searchParams.get('service')

  if (!service && (req.method === 'POST' || req.method === 'PUT')) {
    service = body.service
  }

  if (service !== 'quotes') {
    await resolveUserScope(req, userId ?? null)
  }

  if (service === 'oura') {
    return await runOuraSync(req)
  } else if (service === 'strava') {
    return await runStravaSync(req)
  } else if (service === 'calendar') {
    return await runCalendarSync(req)
  } else if (service === 'nextdns') {
    return await runNextDnsSync(req)
  } else if (service === 'quotes') {
    return await runQuotesSync(req)
  } else {
    throw new Error(`Unknown or missing service parameter: ${service}`)
  }
}, { auth: 'none' }))
