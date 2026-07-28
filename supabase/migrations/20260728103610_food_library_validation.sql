ALTER TABLE public.food_library
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS validation_reason text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

ALTER TABLE public.food_library
  DROP CONSTRAINT IF EXISTS food_library_validation_status_check;

ALTER TABLE public.food_library
  ADD CONSTRAINT food_library_validation_status_check
  CHECK (validation_status IN ('unreviewed', 'verified', 'quarantined'));

UPDATE public.food_library
SET
  validation_status = 'quarantined',
  validation_reason = CASE
    WHEN lower(name) ~ '(bułka|bulka|chleb|bagietka|kajzerka)'
      AND calories < 180
      THEN 'implausible bread energy density below 180 kcal/100g'
    WHEN lower(name) ~ '(kebab|burger|pizza|zapiekanka|hot dog)'
      AND calories < 120
      THEN 'implausible composite meal energy density below 120 kcal/100g'
    ELSE validation_reason
  END,
  validated_at = now()
WHERE
  (
    lower(name) ~ '(bułka|bulka|chleb|bagietka|kajzerka)'
    AND calories < 180
  )
  OR
  (
    lower(name) ~ '(kebab|burger|pizza|zapiekanka|hot dog)'
    AND calories < 120
  );

CREATE INDEX IF NOT EXISTS food_library_active_name_idx
  ON public.food_library (user_id, lower(name))
  WHERE validation_status <> 'quarantined';
