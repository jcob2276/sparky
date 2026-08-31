-- Copy legacy portion memory from graveyard → public (idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'graveyard'
      AND table_name = 'user_portions'
  ) THEN
    INSERT INTO public.user_portions (id, user_id, name, grams, unit, updated_at)
    SELECT gp.id, gp.user_id, gp.name, gp.grams, NULL::text, now()
    FROM graveyard.user_portions gp
    ON CONFLICT (user_id, name) DO UPDATE
      SET grams = EXCLUDED.grams,
          unit = EXCLUDED.unit,
          updated_at = EXCLUDED.updated_at;
  END IF;
END $$;
