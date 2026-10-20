-- Lifetime library: books read, films watched, courses done (the virtual shelf in Rozwój).
-- Filled by (1) bulk import (pasted list / CSV), (2) automatically when a monthly plan item is finished
-- (log_learning_progress), (3) manual single adds. The finish date is optional: only the year, or nothing.

CREATE TABLE IF NOT EXISTS public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  author text CHECK (author IS NULL OR length(btrim(author)) BETWEEN 1 AND 200),
  resource_type text NOT NULL DEFAULT 'book'
    CHECK (resource_type IN ('book', 'video', 'course', 'article', 'podcast', 'other')),
  pages integer CHECK (pages IS NULL OR pages BETWEEN 1 AND 5000),
  finished_on date,
  finished_year smallint CHECK (finished_year IS NULL OR finished_year BETWEEN 1900 AND 2100),
  rating numeric(2, 1) CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5)),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'paste', 'csv', 'plan')),
  assignment_id uuid REFERENCES public.learning_assignments (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT library_items_one_date_precision CHECK (finished_on IS NULL OR finished_year IS NULL)
);

-- Re-importing the same list must not duplicate: same title (any case), author and type is one item.
CREATE UNIQUE INDEX IF NOT EXISTS library_items_dedupe
  ON public.library_items (user_id, lower(btrim(title)), lower(coalesce(btrim(author), '')), resource_type);
CREATE UNIQUE INDEX IF NOT EXISTS library_items_assignment
  ON public.library_items (assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS library_items_user_finished ON public.library_items (user_id, finished_on);

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY library_items_owner ON public.library_items
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.library_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;

COMMENT ON TABLE public.library_items IS
  'Lifetime library (virtual shelf): finished books/films/courses. Date is optional (exact day, only the year, or unknown).';

-- Same function as before, plus: finishing a plan item puts it on the shelf; undoing removes the plan-made entry.
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

  IF a.status = 'done' THEN
    -- A same-titled entry already on the shelf (e.g. imported earlier) is kept as is: DO NOTHING.
    INSERT INTO public.library_items (user_id, title, resource_type, pages, finished_on, source, assignment_id)
    VALUES (
      v_user, a.title,
      CASE WHEN a.resource_type IN ('book', 'video', 'course', 'article', 'podcast') THEN a.resource_type ELSE 'other' END,
      CASE WHEN a.unit = 'pages' THEN a.total::integer ELSE NULL END,
      p_date, 'plan', a.id
    )
    ON CONFLICT DO NOTHING;
    UPDATE public.library_items SET finished_on = p_date, finished_year = NULL
    WHERE assignment_id = a.id AND user_id = v_user;
  ELSIF a.status = 'active' THEN
    DELETE FROM public.library_items
    WHERE assignment_id = a.id AND user_id = v_user AND source = 'plan';
  END IF;

  RETURN a;
END;
$$;

REVOKE ALL ON FUNCTION public.log_learning_progress(uuid, date, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_learning_progress(uuid, date, numeric) TO authenticated, service_role;
