export interface GeminiTextResult {
  text: string | null
  finishReason: string | null
  blockReason: string | null
}

type Json = Record<string, unknown>

function asRecord(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}
}

/**
 * Czyta tekst odpowiedzi Gemini. Pomija części „myśli” (`thought: true`) i skleja pozostałe,
 * bo przy modelach z rozumowaniem `parts[0]` bywa streszczeniem myśli, a nie JSON-em.
 */
export function readGeminiText(json: unknown): GeminiTextResult {
  const root = asRecord(json)
  const candidate = asRecord(Array.isArray(root.candidates) ? root.candidates[0] : null)
  const parts = asRecord(candidate.content).parts
  const text = (Array.isArray(parts) ? parts : [])
    .map(asRecord)
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text as string)
    .join('')
  const blockReason = asRecord(root.promptFeedback).blockReason
  return {
    text: text.trim() ? text : null,
    finishReason: typeof candidate.finishReason === 'string' ? candidate.finishReason : null,
    blockReason: typeof blockReason === 'string' ? blockReason : null,
  }
}

/** Odpowiedź ucięta limitem tokenów albo zablokowana nie nadaje się do użycia, nawet jeśli jest tekst. */
export function geminiFailureReason(result: GeminiTextResult): string | null {
  if (result.blockReason) return `zablokowane (${result.blockReason})`
  if (!result.text) return `pusta odpowiedź${result.finishReason ? ` (${result.finishReason})` : ''}`
  if (result.finishReason === 'MAX_TOKENS') return 'odpowiedź ucięta limitem tokenów'
  if (result.finishReason === 'SAFETY' || result.finishReason === 'RECITATION') return `przerwane (${result.finishReason})`
  return null
}

export type MealPhotoShape = 'items' | 'empty' | 'unreadable'

/**
 * Rozróżnia „model świadomie zwrócił pustą listę” od „nie udało się odczytać odpowiedzi”.
 * Ucięty lub nieczytelny JSON parsuje się do `{}`, co wcześniej wyglądało jak „brak jedzenia na zdjęciu”.
 */
export function classifyMealPhotoResponse(parsed: Record<string, unknown>): MealPhotoShape {
  if (!Array.isArray(parsed.items)) return 'unreadable'
  return parsed.items.length > 0 ? 'items' : 'empty'
}
