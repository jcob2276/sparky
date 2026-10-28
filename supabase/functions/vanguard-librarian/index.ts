/**
 * @function vanguard-librarian
 * @trigger Manual / cron / webhook
 * @role Bibliotekarz: oczyszcza i normalizuje wpisy o posiłkach bez dokładnych makr (llm_estimate) do bazy food_library, informując przez Telegram.
 * @reads daily_food_entries, food_library, food_corrections
 * @writes food_library
 * @calls deepseek-chat, api.telegram.org (bezpośrednio)
 * @consumer Powiadomienia w Telegramie i baza danych produktów
 * @status active
 */
import { serveJson } from '../_shared/http.ts';
import { runLibrarian } from './librarian.ts';
Deno.serve(serveJson(async () => {
  const result = await runLibrarian()
  return { ok: true, ...result }
}, { auth: 'service' }))
