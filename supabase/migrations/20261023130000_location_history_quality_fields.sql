-- Location accuracy upgrade: store fix quality (speed/bearing/altitude/provider) and
-- visit (dwell) records produced by the native Fused collector.
-- created_at stays the fix time (UTC timestamptz); Warsaw day boundaries are applied at query time.
ALTER TABLE public.location_history
  ADD COLUMN IF NOT EXISTS speed double precision,
  ADD COLUMN IF NOT EXISTS bearing double precision,
  ADD COLUMN IF NOT EXISTS altitude double precision,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'point',
  ADD COLUMN IF NOT EXISTS dwell_seconds integer;

ALTER TABLE public.location_history
  DROP CONSTRAINT IF EXISTS location_history_kind_check;
ALTER TABLE public.location_history
  ADD CONSTRAINT location_history_kind_check CHECK (kind IN ('point', 'visit'));

ALTER TABLE public.location_history
  DROP CONSTRAINT IF EXISTS location_history_dwell_seconds_check;
ALTER TABLE public.location_history
  ADD CONSTRAINT location_history_dwell_seconds_check CHECK (dwell_seconds IS NULL OR dwell_seconds >= 0);

COMMENT ON COLUMN public.location_history.kind IS 'point = single filtered fix; visit = stationary stay (created_at = arrival, dwell_seconds = duration)';
COMMENT ON COLUMN public.location_history.accuracy IS 'Horizontal accuracy radius in meters (68% confidence)';
