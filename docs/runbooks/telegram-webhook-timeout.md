# Telegram: timeout i częściowe wykonanie

Bieżący przepływ to `vanguard-telegram` → trwały `vanguard_telegram_inbox` →
`vanguard-telegram-worker`; odpowiedź wychodzi przez `outbound_messages` i sender.
Webhook zwraca 200 dopiero po zapisie inboxu. Błąd akceptacji pozostaje retryable (503).
Transkrypcja i LLM wykonują się w workerze, poza budżetem odpowiedzi webhooka.

Przy duplikatach, samym ack głosu albo częściowym zapisie:

1. Sprawdź status/error_log inboxu, worker i outbox według [diagnostyki bota](bot-not-responding.md).
2. Rozróżnij błąd przyjęcia wiadomości od błędu przetwarzania/dostarczenia odpowiedzi.
3. Gemini (`gemini.transcribe`, `GEMINI_API_KEY`) i DeepSeek diagnozuj w logach workera.
4. Sprawdź `vanguard_stream.metadata.telegram_message_id` oraz `daily_reconciliations`:
   istniejący stream przy refleksji nadal `sent` wymaga ścieżki resume, nie drugiego zapisu.

Zachowaj idempotencję i trwałą kolejkę. Nie przenoś wymaganej pracy do IIFE ani
`EdgeRuntime.waitUntil` po zwróceniu HTTP — nie gwarantują zakończenia zadania.
Jeśli naprawiasz kod workera, awaituj przetwarzanie i zapis statusu przed jego odpowiedzią;
jego 200 nie jest dowodem sukcesu domenowego.
