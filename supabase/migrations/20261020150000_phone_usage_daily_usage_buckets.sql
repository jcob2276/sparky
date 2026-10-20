-- Half-hour foreground minutes per day, so any evening cut-off (e.g. 21:30) can be
-- computed in the app instead of being hard-coded in the native plugin (23:00-04:00).
-- Existing rows stay NULL: history before the APK update has no hourly distribution.
ALTER TABLE public.phone_usage_daily
  ADD COLUMN IF NOT EXISTS usage_buckets jsonb;

COMMENT ON COLUMN public.phone_usage_daily.usage_buckets IS
  '48 integer foreground minutes (0-30 each) per half-hour of the local Europe/Warsaw day; index 0 = 00:00-00:30, index 47 = 23:30-24:00. Bucketed by wall-clock time (DST days share/skip buckets). NULL = no hourly data (older APK or pre-rollout history).';

ALTER TABLE public.phone_usage_daily
  DROP CONSTRAINT IF EXISTS phone_usage_daily_usage_buckets_shape;
ALTER TABLE public.phone_usage_daily
  ADD CONSTRAINT phone_usage_daily_usage_buckets_shape
  CHECK (
    usage_buckets IS NULL
    OR (jsonb_typeof(usage_buckets) = 'array' AND jsonb_array_length(usage_buckets) = 48)
  );
