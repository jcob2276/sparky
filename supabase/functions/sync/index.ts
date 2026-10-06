/**
 * @function sync
 * @trigger HTTP POST / manual / cron
 * @role Router synchronizacji biometrii, kalendarza i danych rynkowych; fundamenty GPW, notowania, dokumenty House PTR i SEC 13F tylko dla service role.
 * @reads oura_daily_summary, strava_activities, vanguard_calendar, user_settings, vanguard_tokens, oura_enhanced, strava_tokens, intervals_tokens, oura_heartrate, oura_sleep_hr_timeline, oura_sleep_hrv_timeline, oura_sleep_phase_timeline
 * @writes oura_daily_summary, strava_activities, vanguard_calendar, audit_events, oura_enhanced, oura_heartrate, oura_sleep_phase_timeline, strava_tokens, vanguard_tokens, gpw_fin_public_teaser, prices_daily, market_quotes, house_disclosures, stock_act_trades, investment_source_status, filings, sec13f_positions
 * @calls ouraring.com, strava.com, googleapis.com/calendar, api.telegram.org (poprzez send.ts), scanner.tradingview.com, api.nbp.pl, query1.finance.yahoo.com, disclosures-clerk.house.gov, data.sec.gov/submissions, www.sec.gov/Archives
 * @consumer Zaktualizowane dane biometryczne, treningowe i kalendarza oraz fundamenty i prognozy GPW w aplikacji
 * @status active
 */
import { resolveUserScope } from '../_shared/supabase.ts'
import { serveJson } from '../_shared/http.ts'
import { runOuraSync } from './oura.ts'
import { runStravaSync } from './strava.ts'
import { runCalendarSync } from './calendar.ts'
import { runNextDnsSync } from './nextdns.ts'
import { runQuotesSync } from './quotes.ts'
import { runKnfShortsSync } from './knfShorts.ts'
import { runSenateSync } from './senateTrades.ts'
import { requireServiceRole } from '../_shared/auth.ts'
import { runGpwFundamentalsSync } from './gpwFundamentals.ts'
import { runInvestmentAi } from './investmentAi.ts'
import { runSec13fSync } from './sec13f.ts'

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

  if (service === 'gpw_fundamentals') {
    const authError = requireServiceRole(req)
    if (authError) return authError
    return await runGpwFundamentalsSync()
  }

  if (service === 'house_disclosures') {
    const { runHouseDisclosuresSync } = await import('./houseDisclosures.ts')
    return await runHouseDisclosuresSync(req)
  }
  if (service === 'sec_13f') return await runSec13fSync(req)

  if (service !== 'quotes' && service !== 'knf_shorts' && service !== 'senate' && service !== 'congress') {
    await resolveUserScope(req, userId ?? null)
  }

  if (service === 'investment_ai') {
    return await runInvestmentAi(req)
  } else if (service === 'oura') {
    return await runOuraSync(req)
  } else if (service === 'strava') {
    return await runStravaSync(req)
  } else if (service === 'calendar') {
    return await runCalendarSync(req)
  } else if (service === 'nextdns') {
    return await runNextDnsSync(req)
  } else if (service === 'quotes') {
    return await runQuotesSync(req)
  } else if (service === 'knf_shorts') {
    return await runKnfShortsSync(req)
  } else if (service === 'senate' || service === 'congress') {
    return await runSenateSync(req)
  } else {
    throw new Error(`Unknown or missing service parameter: ${service}`)
  }
}, { auth: 'none' }))
