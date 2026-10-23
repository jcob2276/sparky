-- Visit rows (arrival time) may share created_at with a point fix; uniqueness is per (user, time, kind).
-- Native retries upsert on this key, so duplicate uploads are idempotent.
ALTER TABLE public.location_history
  DROP CONSTRAINT IF EXISTS location_history_user_id_created_at_key;
ALTER TABLE public.location_history
  ADD CONSTRAINT location_history_user_id_created_at_kind_key UNIQUE (user_id, created_at, kind);
