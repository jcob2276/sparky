# Deployed Edge Functions Ledger

This ledger tracks all manual deployments of Supabase Edge Functions. Always record your deployment here **before** deploying to production.

Historical deploys before this ledger existed are not backfilled — verify actual
live state with `list_edge_functions` (Supabase MCP) or `supabase functions list`
rather than trusting entries you didn't write yourself.

| Function Name | Git SHA | Deployed At | Deployed By | Notes / Reason |
|---|---|---|---|---|
| Local Edge Functions (`supabase/functions/*/index.ts`) | 002107467bfa4e7b67e09e31d2b1748121dcf3ad | 2026-10-15 | Codex | Published via CLI API. OPTIONS smoke passed; owner analytics/training reads and unauthorized rejection passed. Prior JWT flags restored after explicit user approval and recorded in config. Vercel production deployment of the same application commit succeeded. |
| vanguard-auto-classify | 0b2bf176 | 2026-07-13 | Antigravity | Fix check constraint violation by mapping recovery_event to positive_micro_action and clamping other invalid event_kind values to null. |
