-- Monthly learning plan: up to a few materials per month (book / course / article / video) with a
-- deadline, plus a per-day progress log. The daily slot is derived from remaining amount / days left.
-- Replaces the unused library_items / practice_evidences JSON blobs in vanguard_identity (both empty).

CREATE TABLE IF NOT EXISTS public.learning_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  month_start date NOT NULL,
  link_id uuid REFERENCES public.vanguard_links (id) ON DELETE SET NULL,
  skill_id uuid REFERENCES public.learning_skills (id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  resource_type text NOT NULL DEFAULT 'other'
    CHECK (resource_type IN ('book', 'course', 'article', 'video', 'podcast', 'other')),
  unit text NOT NULL DEFAULT 'pages' CHECK (unit IN ('pages', 'minutes', 'lessons', 'items')),
  total numeric NOT NULL CHECK (total > 0),
  done numeric NOT NULL DEFAULT 0 CHECK (done >= 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'dropped')),
  position smallint NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_assignments_month_is_first_day CHECK (month_start = date_trunc('month', month_start)::date),
  CONSTRAINT learning_assignments_due_in_or_after_month CHECK (due_date >= month_start)
);

CREATE INDEX IF NOT EXISTS learning_assignments_user_month
  ON public.learning_assignments (user_id, month_start, status);
CREATE INDEX IF NOT EXISTS learning_assignments_link ON public.learning_assignments (link_id) WHERE link_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS learning_assignments_skill ON public.learning_assignments (skill_id) WHERE skill_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.learning_progress_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.learning_assignments (id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, date)
);

CREATE INDEX IF NOT EXISTS learning_progress_log_user_date ON public.learning_progress_log (user_id, date);

CREATE OR REPLACE TRIGGER trg_learning_assignments_updated_at
  BEFORE UPDATE ON public.learning_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.learning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_assignments_owner ON public.learning_assignments
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY learning_progress_log_owner ON public.learning_progress_log
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress_log TO authenticated;
GRANT ALL ON public.learning_assignments TO service_role;
GRANT ALL ON public.learning_progress_log TO service_role;

-- Single write path for progress. p_amount is the amount done on p_date (idempotent per day, 0 = undo).
-- SECURITY INVOKER: RLS keeps it scoped to the caller.
CREATE OR REPLACE FUNCTION public.log_learning_progress(p_assignment_id uuid, p_date date, p_amount numeric)
RETURNS public.learning_assignments
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  a public.learning_assignments;
  v_done numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'amount must be >= 0';
  END IF;

  SELECT * INTO a FROM public.learning_assignments
  WHERE id = p_assignment_id AND user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assignment not found';
  END IF;

  INSERT INTO public.learning_progress_log (user_id, assignment_id, date, amount)
  VALUES (v_user, a.id, p_date, p_amount)
  ON CONFLICT (assignment_id, date) DO UPDATE SET amount = EXCLUDED.amount;

  SELECT COALESCE(SUM(amount), 0) INTO v_done
  FROM public.learning_progress_log WHERE assignment_id = a.id;

  UPDATE public.learning_assignments
  SET done = LEAST(v_done, a.total),
      status = CASE
        WHEN a.status = 'dropped' THEN 'dropped'
        WHEN v_done >= a.total THEN 'done'
        ELSE 'active'
      END,
      completed_at = CASE
        WHEN a.status = 'dropped' THEN a.completed_at
        WHEN v_done >= a.total THEN COALESCE(a.completed_at, now())
        ELSE NULL
      END
  WHERE id = a.id
  RETURNING * INTO a;

  RETURN a;
END;
$$;

REVOKE ALL ON FUNCTION public.log_learning_progress(uuid, date, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_learning_progress(uuid, date, numeric) TO authenticated, service_role;

COMMENT ON TABLE public.learning_assignments IS
  'Monthly learning plan items (book/course/article/video) with total, done, due date; the daily slot is derived in the app.';
COMMENT ON TABLE public.learning_progress_log IS
  'Amount of a learning assignment done on a given day (one row per assignment and day).';
