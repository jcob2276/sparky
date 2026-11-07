import { createServiceClient } from "../_shared/supabase.ts"
import { fetchAllPages } from "./timeseries.ts"

const OURA_HEARTRATE_URL = 'https://api.ouraring.com/v2/usercollection/heartrate'
/** Okno większe niż to odrzuca endpoint Oury i przekracza limit CPU funkcji; archiwizator dzieli zakres sam. */
const MAX_WINDOW_MS = 8 * 24 * 3600 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Przekazuje surowe próbki tętna Oury dla jednego krótkiego okna do archiwum na VPS.
 * Uwierzytelnia wąski sekret `ARCHIVE_SECRET` (nagłówek x-archive-secret), nie klucz serwisowy:
 * worker na VPS może dzięki temu tylko czytać okna tętna. Token Oury zostaje w Supabase.
 * Funkcja nie przetwarza ani nie zapisuje danych, więc mieści się w limicie CPU Edge.
 * Odpowiedź to tablice [ts, bpm, source].
 */
export const runHeartrateRaw = async (req: Request) => {
  const expected = Deno.env.get('ARCHIVE_SECRET') ?? ''
  const given = req.headers.get('x-archive-secret') ?? ''
  if (expected.length < 32 || !safeEqual(given, expected)) throw new Error("Unauthorized")

  const body = await req.json().catch(() => ({}))
  const userId = String(body.userId ?? '')
  if (!UUID_RE.test(userId)) throw new Error("Niepoprawny userId")

  const startMs = Date.parse(body.start)
  const endMs = Date.parse(body.end)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error("Niepoprawny zakres start/end (ISO 8601)")
  }
  if (endMs - startMs > MAX_WINDOW_MS) throw new Error("Okno dłuższe niż 8 dni")

  const { data: settings, error } = await createServiceClient()
    .from('user_settings').select('oura_token').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!settings?.oura_token) throw new Error("Brak tokenu Oury dla użytkownika")

  const url = `${OURA_HEARTRATE_URL}?start_datetime=${encodeURIComponent(new Date(startMs).toISOString())}`
    + `&end_datetime=${encodeURIComponent(new Date(endMs).toISOString())}`
  const items = await fetchAllPages(url, { Authorization: `Bearer ${settings.oura_token}` })
  const samples = items
    .filter((it: any) => it.timestamp && it.bpm != null)
    .map((it: any) => [it.timestamp, it.bpm, it.source ?? null])
  return { success: true, count: samples.length, samples }
}
