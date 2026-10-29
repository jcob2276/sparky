import { invokeEdge } from './supabase';
import type { Json } from './database.types';

/**
 * Canonical app write into vanguard_stream. Goes through vanguard-capture so every
 * entry gets a Gemini embedding (same as Telegram enrichment).
 */
async function appendStreamEntry(input: {
  userId: string;
  source: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  classification?: string;
  category?: string;
}): Promise<void> {
  const result = await invokeEdge('vanguard-capture', {
    body: {
      userId: input.userId,
      content: input.content,
      source: input.source,
      metadata: (input.metadata ?? {}) as Record<string, unknown>,
      ...(input.classification ? { classification: input.classification } : {}),
      ...(input.category ? { category: input.category } : {}),
    },
  });
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(String(result.error));
  }
  if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
    throw new Error('Nie udało się zapisać wpisu do strumienia.');
  }
}

/** @deprecated Prefer appendStreamEntry — kept for callers that already have a TablesInsert shape. */
export async function insertSparkyStream(entry: {
  user_id: string;
  source: string;
  content: string;
  classification?: string | null;
  category?: string | null;
  metadata?: Json | null;
}): Promise<void> {
  await appendStreamEntry({
    userId: entry.user_id,
    source: entry.source,
    content: entry.content,
    classification: entry.classification ?? undefined,
    category: entry.category ?? undefined,
    metadata: (entry.metadata ?? null) as Record<string, unknown> | null,
  });
}
