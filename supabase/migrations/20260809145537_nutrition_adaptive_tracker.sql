CREATE TABLE public.nutrition_meal_captures (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  source text NOT NULL CHECK (source IN ('photo', 'text', 'barcode', 'repeat', 'search')),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed')),
  estimate_min_kcal integer CHECK (estimate_min_kcal IS NULL OR estimate_min_kcal >= 0),
  estimate_max_kcal integer CHECK (
    estimate_max_kcal IS NULL OR estimate_max_kcal >= COALESCE(estimate_min_kcal, 0)
  ),
  parse_summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(parse_summary) = 'object'),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nutrition_meal_captures_user_date_idx
  ON public.nutrition_meal_captures (user_id, date, confirmed_at);

CREATE TABLE public.nutrition_meal_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL CHECK (length(btrim(fingerprint)) BETWEEN 1 AND 500),
  name text CHECK (name IS NULL OR length(name) <= 160),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0),
  confirmed_count integer NOT NULL DEFAULT 1 CHECK (confirmed_count > 0),
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  source_capture_id uuid REFERENCES public.nutrition_meal_captures(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX nutrition_meal_memories_user_recent_idx
  ON public.nutrition_meal_memories (user_id, last_confirmed_at DESC);

CREATE TABLE public.nutrition_day_reviews (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  completeness text NOT NULL CHECK (completeness IN ('complete', 'partial', 'unknown')),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.nutrition_meal_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_meal_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_day_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY nutrition_meal_captures_select ON public.nutrition_meal_captures
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY nutrition_meal_captures_insert ON public.nutrition_meal_captures
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY nutrition_meal_memories_select ON public.nutrition_meal_memories
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY nutrition_meal_memories_insert ON public.nutrition_meal_memories
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY nutrition_meal_memories_update ON public.nutrition_meal_memories
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY nutrition_day_reviews_select ON public.nutrition_day_reviews
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY nutrition_day_reviews_insert ON public.nutrition_day_reviews
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY nutrition_day_reviews_update ON public.nutrition_day_reviews
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.nutrition_meal_captures TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.nutrition_meal_memories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.nutrition_day_reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_nutrition_meal_capture(
  p_user_id uuid,
  p_capture_id uuid,
  p_date date,
  p_meal_type text,
  p_source text,
  p_items jsonb,
  p_parse_summary jsonb,
  p_memory jsonb DEFAULT NULL
) RETURNS SETOF public.daily_food_entries
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_grams integer;
  v_entry jsonb;
  v_rows integer;
  v_fingerprint text;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_capture_id IS NULL THEN RAISE EXCEPTION 'missing capture id'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items must be a non-empty array';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.nutrition_meal_captures
    WHERE id = p_capture_id AND user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'forbidden capture owner';
  END IF;

  INSERT INTO public.nutrition_meal_captures (
    id, user_id, date, meal_type, source, status,
    estimate_min_kcal, estimate_max_kcal, parse_summary
  ) VALUES (
    p_capture_id, p_user_id, p_date, p_meal_type, p_source, 'confirmed',
    NULLIF(p_parse_summary #>> '{estimate,minKcal}', '')::integer,
    NULLIF(p_parse_summary #>> '{estimate,maxKcal}', '')::integer,
    COALESCE(p_parse_summary, '{}'::jsonb)
  ) ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN QUERY
      SELECT * FROM public.daily_food_entries
      WHERE user_id = p_user_id AND meal_group_id = p_capture_id
      ORDER BY created_at;
    RETURN;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF NULLIF(v_item->>'requestId', '') IS NULL THEN
      RAISE EXCEPTION 'item requestId is required';
    END IF;
    IF jsonb_typeof(v_item->'per100') <> 'object' THEN
      RAISE EXCEPTION 'item per100 is required';
    END IF;
    v_grams := greatest(1, round((v_item->>'grams')::numeric)::integer);
    v_entry := (v_item->'per100') || jsonb_build_object(
      'name', v_item->>'name',
      'brand', v_item->>'brand',
      'barcode', v_item->>'barcode',
      'meal_type', p_meal_type,
      'meal_group_id', p_capture_id,
      'request_id', v_item->>'requestId',
      'parse_meta', COALESCE(v_item->'parseMeta', '{}'::jsonb) || jsonb_build_object(
        'capture_id', p_capture_id,
        'input_mode', p_source,
        'user_confirmed', true
      )
    );
    PERFORM public.add_food_entry(p_user_id, p_date, v_grams, v_entry);
  END LOOP;

  IF p_memory IS NOT NULL THEN
    v_fingerprint := NULLIF(btrim(p_memory->>'fingerprint'), '');
    IF v_fingerprint IS NULL THEN RAISE EXCEPTION 'memory fingerprint is required'; END IF;
    INSERT INTO public.nutrition_meal_memories (
      user_id, fingerprint, name, meal_type, items, confirmed_count,
      last_confirmed_at, source_capture_id
    ) VALUES (
      p_user_id, v_fingerprint, NULLIF(p_memory->>'name', ''), p_meal_type,
      p_items, 1, now(), p_capture_id
    ) ON CONFLICT (user_id, fingerprint) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, public.nutrition_meal_memories.name),
      meal_type = EXCLUDED.meal_type,
      items = EXCLUDED.items,
      confirmed_count = public.nutrition_meal_memories.confirmed_count + 1,
      last_confirmed_at = now(),
      source_capture_id = p_capture_id,
      updated_at = now();
  END IF;

  RETURN QUERY
    SELECT * FROM public.daily_food_entries
    WHERE user_id = p_user_id AND meal_group_id = p_capture_id
    ORDER BY created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_nutrition_meal_capture(
  uuid, uuid, date, text, text, jsonb, jsonb, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_nutrition_meal_capture(
  uuid, uuid, date, text, text, jsonb, jsonb, jsonb
) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_nutrition_meal_capture(
  uuid, uuid, date, text, text, jsonb, jsonb, jsonb
) TO authenticated;
