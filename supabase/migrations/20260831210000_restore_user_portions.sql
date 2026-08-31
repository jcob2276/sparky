-- Restore user_portions for per-product portion memory (parse-food-nl + Meal Composer).
CREATE TABLE IF NOT EXISTS public.user_portions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  grams integer NOT NULL CHECK (grams > 0 AND grams <= 10000),
  unit text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_portions_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_portions_user_id ON public.user_portions (user_id);

ALTER TABLE public.user_portions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_portions_read" ON public.user_portions;
CREATE POLICY "user_portions_read" ON public.user_portions
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_portions_insert" ON public.user_portions;
CREATE POLICY "user_portions_insert" ON public.user_portions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_portions_update" ON public.user_portions;
CREATE POLICY "user_portions_update" ON public.user_portions
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_portions_delete" ON public.user_portions;
CREATE POLICY "user_portions_delete" ON public.user_portions
  FOR DELETE USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_portions TO authenticated;
GRANT ALL ON public.user_portions TO service_role;
