# Deployed Edge Functions Ledger

This ledger tracks all manual deployments of Supabase Edge Functions. Always record your deployment here **before** deploying to production.

Historical deploys before this ledger existed are not backfilled — verify actual
live state with `list_edge_functions` (Supabase MCP) or `supabase functions list`
rather than trusting entries you didn't write yourself.

| Function Name | Git SHA | Deployed At | Deployed By | Notes / Reason |
|---|---|---|---|---|
| vanguard-telegram, vanguard-oracle, vanguard-nightly, vanguard-mcp-server, analyze-training-load, parse-food-nl, recap, vanguard-wiki-compiler | 514a058e | 2026-10-28 | Claude | Lenie: jeden zapis do habit_logs; Oracle: biometria z dokładnej daty, rytm dobowy, planer; nightly: dzień biegowy przez isRunSport; recap i parser: wspólna reguła celu, pełne dni, strefa Warszawy; wiki: bez nieistniejącego updated_at. Smoke 58 ok / 0 fail. |
| parse-food-nl | ce92d551 | 2026-10-20 | Claude | Zdjęcie posiłku: Gemini czytane przez readGeminiText (pomija myśli, wykrywa ucięcie/blokadę), nieczytelna odpowiedź to błąd zamiast „0 items”, limit 6000 tokenów. CLI API deploy (verify_jwt z config.toml). Smoke 29 ok / 0 fail. |
| vanguard-telegram, vanguard-telegram-worker, vanguard-capture | 33011bba + working tree transcription fix | 2026-10-19 | Codex | Replaced unavailable audio models; Whisper resolves its own credentials. CLI API deploy with existing JWT flags; Deno checks, edge tests and smoke passed. Original failed voice recovered and verified in stream. OpenAI secret remains invalid. |
| Local Edge Functions (`supabase/functions/*/index.ts`) | 002107467bfa4e7b67e09e31d2b1748121dcf3ad | 2026-10-15 | Codex | Published via CLI API. OPTIONS smoke passed; owner analytics/training reads and unauthorized rejection passed. Prior JWT flags restored after explicit user approval and recorded in config. Vercel production deployment of the same application commit succeeded. |
| vanguard-auto-classify | 0b2bf176 | 2026-07-13 | Antigravity | Fix check constraint violation by mapping recovery_event to positive_micro_action and clamping other invalid event_kind values to null. |
