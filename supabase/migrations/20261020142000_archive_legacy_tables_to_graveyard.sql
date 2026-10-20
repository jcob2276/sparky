-- Archive (not drop) legacy tables that have no reader or writer anywhere: no code, cron, view,
-- function, trigger or FK (verified 2026-10-20). gpw_short_positions was replaced by the
-- replace_knf_snapshot / vw_gpw_shorts_history pipeline (last write 2026-09-27).
-- Reversible: ALTER TABLE graveyard.<t> SET SCHEMA public.
CREATE SCHEMA IF NOT EXISTS graveyard;
ALTER TABLE IF EXISTS public.gpw_short_positions SET SCHEMA graveyard;
ALTER TABLE IF EXISTS public.convergence_live    SET SCHEMA graveyard;
ALTER TABLE IF EXISTS public.vw_consensus_ticker SET SCHEMA graveyard;
