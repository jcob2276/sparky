import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Error carrying an HTTP status for the Android widget functions (HttpError only allows a few codes). */
export class WidgetHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Validates the per-install widget token (header `x-widget-token`) against the stored hash; returns the user id. */
export async function requireWidgetUser(db: SupabaseClient, req: Request, body: Record<string, unknown>): Promise<string> {
  const userId = typeof body.userId === 'string' ? body.userId : ''
  const token = req.headers.get('x-widget-token') || ''
  if (!userId || !token) throw new WidgetHttpError(401, 'Brak dostępu do widgetu.')
  const { data: row } = await db.from('widget_tokens').select('token_hash').eq('user_id', userId).maybeSingle()
  if (!row || row.token_hash !== await sha256Hex(token)) {
    throw new WidgetHttpError(401, 'Widget wymaga ponownego połączenia — otwórz aplikację.')
  }
  return userId
}
