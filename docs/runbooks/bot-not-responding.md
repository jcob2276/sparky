# Bot Sparky nie odpowiada

1. Wyślij wejście do Oracle (np. `?` z pytaniem); sprawdź, czy nie przejęła go komenda lub refleksja.
   Sprawdź logi `vanguard-telegram` i `getWebhookInfo` (`last_error_message`, `pending_update_count`).
2. 503 „Webhook secret not configured”: brak `TELEGRAM_WEBHOOK_SECRET` w Supabase.
   403: niezgodny `secret_token` albo nadawca. Sprawdź też `TELEGRAM_CHAT_ID` i bot token.
3. URL webhooka musi kończyć się `/functions/v1/vanguard-telegram`, bez `?apikey=`.
   Admin może ponownie zarejestrować webhook przez POST `{"fix_webhook":true}` z bearer
   `TELEGRAM_SETUP_SECRET` (fallback: service-role). Użyj istniejącego sekretu; nie kopiuj go do repo/logów.
4. Gateway 401: porównaj JWT z [rejestrem](../../supabase/functions/README.md) i
   [procedurą deployu](deploy-edge-function.md). Worker/outbox wymagają service-role w kodzie.
5. Webhook 200 oznacza trwały inbox, nie gotową odpowiedź. Sprawdź kolejki i logi worker/sender:

```sql
SELECT id, status, error_log, updated_at
FROM vanguard_telegram_inbox ORDER BY created_at DESC LIMIT 10;

SELECT id, status, attempts, send_after, error_log, updated_at
FROM outbound_messages ORDER BY created_at DESC LIMIT 10;

SELECT id, date, status, planning_status, user_response IS NOT NULL AS has_response
FROM daily_reconciliations ORDER BY created_at DESC LIMIT 3;
```

Inbox pending/processing bez postępu: sprawdź DB trigger i wywołanie `vanguard-telegram-worker`.
Failed: czytaj `error_log` i `audit_events`. Outbox pending z przyszłym `send_after` jest zaplanowany;
failed lub utknięty processing wymaga logów `vanguard-outbox-sender`, nie ponownego capture.

Głos zatrzymany na „Transkrybuję…”: sprawdź Gemini (`gemini.transcribe`, `GEMINI_API_KEY`)
i DeepSeek oraz status refleksji. Zanim ponowisz wiadomość, sprawdź stream i
`metadata.telegram_message_id`; zachowaj dedup i istniejącą ścieżkę resume refleksji.
[Timeout i granica przetwarzania](telegram-webhook-timeout.md).
