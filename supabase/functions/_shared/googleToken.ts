/**
 * googleToken.ts — Wspólny helper OAuth dla integracji Google Calendar.
 * Używany przez: sync (calendar.ts), calendar-write, calendar-watch.
 * Pojedyncze miejsce odświeżania access tokena z vanguard_tokens.
 */
import { safeExecute, createServiceClient } from './supabase.ts'

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null

  const tokenData = await safeExecute(
    supabase
      .from('vanguard_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .maybeSingle()
  )
  if (!tokenData?.refresh_token) {
    console.warn('[googleToken] No Google refresh_token found for user', userId)
    return null
  }

  try {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokenData.refresh_token,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    })
    if (!refreshRes.ok) {
      const errBody = await refreshRes.text().catch(() => '')
      console.warn('[googleToken] Refresh failed:', refreshRes.status, errBody.substring(0, 150))
      return null
    }
    const { access_token } = await refreshRes.json()
    return access_token ?? null
  } catch (err) {
    console.warn('[googleToken] Refresh exception:', err)
    return null
  }
}
