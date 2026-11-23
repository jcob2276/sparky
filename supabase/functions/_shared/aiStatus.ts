import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Database } from './database.types.ts'

export type AiProvider = 'vision' | 'text'
export type AiErrorKind = 'quota' | 'overload' | 'balance' | 'other'

/** Sprowadza błąd dostawcy AI do rodzaju, który aplikacja umie wytłumaczyć. */
export function classifyAiError(error: unknown): AiErrorKind {
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : null
  const message = error instanceof Error ? error.message : String(error)
  if (status === 429 || /\b429\b|quota/i.test(message)) return 'quota'
  if (status === 402 || /\b402\b|insufficient balance/i.test(message)) return 'balance'
  if (status === 503 || /\b503\b|overload|high demand|timed out|timeout/i.test(message)) return 'overload'
  return 'other'
}

// Błąd głównego dostawcy tekstu (DeepSeek), po którym zadziałał model zapasowy: sam wynik jest poprawny,
// ale warto pokazać, że główny dostawca nie działa.
let pendingTextFailure: AiErrorKind | null = null
export function noteTextProviderFailure(error: unknown): void { pendingTextFailure = classifyAiError(error) }
export function takeTextProviderFailure(): AiErrorKind | null {
  const kind = pendingTextFailure
  pendingTextFailure = null
  return kind
}

/** Zapis stanu najlepiej jak się da: nigdy nie psuje właściwego żądania. */
export async function recordAiStatus(
  db: SupabaseClient<Database>,
  userId: string | undefined,
  provider: AiProvider,
  outcome: { ok: true } | { ok: false; kind: AiErrorKind },
): Promise<void> {
  if (!userId) return
  const now = new Date().toISOString()
  const base = { user_id: userId, provider, updated_at: now }
  const options = { onConflict: 'user_id,provider' }
  try {
    const table = db.from('ai_provider_status')
    const { error } = outcome.ok
      ? await table.upsert({ ...base, last_ok_at: now }, options)
      : await table.upsert({ ...base, last_error_at: now, last_error_kind: outcome.kind }, options)
    if (error) console.warn('[aiStatus] upsert failed:', error.message)
  } catch (err) {
    console.warn('[aiStatus] upsert threw:', err)
  }
}
