-- Drop tables that are empty in production and have no consumer in src/,
-- supabase/functions/ or scripts/ (verified 2026-10-20: 0 rows, no views or
-- functions reference them; the only FK is form4 -> documents, dropped together).
DROP TABLE IF EXISTS public.investment_form4_transactions;
DROP TABLE IF EXISTS public.investment_documents;
DROP TABLE IF EXISTS public.convergence_backtest;
DROP TABLE IF EXISTS public.finance_dividends;
DROP TABLE IF EXISTS public.finance_holding_targets;
DROP TABLE IF EXISTS public.investment_source_runs;
DROP TABLE IF EXISTS public.investment_watchlist;
DROP TABLE IF EXISTS public.learning_skill_snapshots;
DROP TABLE IF EXISTS public.mcp_servers;
