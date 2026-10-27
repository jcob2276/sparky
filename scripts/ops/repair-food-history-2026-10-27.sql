-- Jednorazowa naprawa historii jedzenia (2026-10-27), wykonana na produkcji jako jedna transakcja (DO).
-- Każda zmiana ma kopię „przed i po” w food_history_repairs (batch = 'history-repair-2026-10-27').
-- Cofnięcie wiersza: INSERT INTO daily_food_entries SELECT * FROM jsonb_populate_record(NULL::daily_food_entries, before) dla kind = 'duplicate_removed';
-- dla pozostałych: UPDATE ... SET <kolumny> z `before`.
DO $repair$
DECLARE
  v_batch constant text := 'history-repair-2026-10-27';
BEGIN
  -- 1) Duble: identyczny wpis starego formatu (bez grupy i bez request_id) zapisany do 20 s po poprzednim.
  CREATE TEMP TABLE _dups ON COMMIT DROP AS
  WITH x AS (
    SELECT id, meal_group_id, request_id, logged_at,
           lag(logged_at) OVER w AS prev_at
    FROM public.daily_food_entries
    WINDOW w AS (PARTITION BY user_id, date, name, amount, meal_type, calories, protein, carbs, fat ORDER BY logged_at, id)
  )
  SELECT id FROM x
  WHERE prev_at IS NOT NULL AND logged_at - prev_at <= interval '20 seconds'
    AND meal_group_id IS NULL AND request_id IS NULL;

  INSERT INTO public.food_history_repairs (user_id, batch, kind, table_name, row_id, before, after, reason)
  SELECT e.user_id, v_batch, 'duplicate_removed', 'daily_food_entries', e.id, to_jsonb(e), NULL,
         'Identyczny wpis (nazwa, ilość, posiłek, kcal i makro) zapisany do 20 s po poprzednim, stary format bez request_id'
  FROM public.daily_food_entries e JOIN _dups d USING (id);

  DELETE FROM public.daily_food_entries e USING _dups d WHERE e.id = d.id;

  -- 2) kcal niezgodne z własnymi makro: makro są wiarygodne (zgodne z ilością), więc kcal = 4B + 4W + 9T.
  CREATE TEMP TABLE _energy ON COMMIT DROP AS
  SELECT id, round(4 * coalesce(protein, 0) + 4 * coalesce(carbs, 0) + 9 * coalesce(fat, 0))::int AS mk
  FROM public.daily_food_entries
  WHERE 4 * coalesce(protein, 0) + 4 * coalesce(carbs, 0) + 9 * coalesce(fat, 0) >= 15
    AND abs(calories - (4 * coalesce(protein, 0) + 4 * coalesce(carbs, 0) + 9 * coalesce(fat, 0))) > greatest(40, 0.3 * calories);

  INSERT INTO public.food_history_repairs (user_id, batch, kind, table_name, row_id, before, after, reason)
  SELECT e.user_id, v_batch, 'energy_fix', 'daily_food_entries', e.id, to_jsonb(e), jsonb_build_object('calories', n.mk),
         'kcal niezgodne z makro (' || e.calories || ' vs ' || n.mk || '): ustawiono kcal z makro'
  FROM public.daily_food_entries e JOIN _energy n USING (id);

  UPDATE public.daily_food_entries e
  SET calories = n.mk,
      parse_meta = coalesce(e.parse_meta, '{}'::jsonb)
        || jsonb_build_object('energy_corrected_from', e.calories, 'energy_corrected_at', now(), 'energy_corrected_by', v_batch)
  FROM _energy n WHERE e.id = n.id;

  -- 3) Cukier nie może przekraczać węglowodanów (cukry są ich częścią): przycinamy do węgli.
  CREATE TEMP TABLE _sugar ON COMMIT DROP AS
  SELECT id, carbs AS capped FROM public.daily_food_entries WHERE sugar > carbs + 0.05;

  INSERT INTO public.food_history_repairs (user_id, batch, kind, table_name, row_id, before, after, reason)
  SELECT e.user_id, v_batch, 'micronutrient_fix', 'daily_food_entries', e.id, to_jsonb(e), jsonb_build_object('sugar', s.capped),
         'cukier ' || e.sugar || ' g większy niż węgle ' || e.carbs || ' g: przycięto do węgli'
  FROM public.daily_food_entries e JOIN _sugar s USING (id);

  UPDATE public.daily_food_entries e SET sugar = s.capped FROM _sugar s WHERE e.id = s.id;

  -- 4) Błonnik absurdalny (większy niż węgle albo oczywisty błąd): kasujemy wartość i zdejmujemy znacznik,
  --    żeby food-micronutrient-backfill oszacował ją od nowa z oznaczeniem estimate.
  CREATE TEMP TABLE _fiber ON COMMIT DROP AS
  SELECT id FROM public.daily_food_entries
  WHERE fiber > carbs + 0.05 OR (name = 'Ptasie Mleczko cytrynowe' AND fiber >= 20);

  INSERT INTO public.food_history_repairs (user_id, batch, kind, table_name, row_id, before, after, reason)
  SELECT e.user_id, v_batch, 'micronutrient_fix', 'daily_food_entries', e.id, to_jsonb(e), jsonb_build_object('fiber', NULL),
         'błonnik ' || e.fiber || ' g niewiarygodny przy węglach ' || e.carbs || ' g: usunięto do ponownego oszacowania'
  FROM public.daily_food_entries e JOIN _fiber f USING (id);

  UPDATE public.daily_food_entries e
  SET fiber = NULL,
      parse_meta = (coalesce(e.parse_meta, '{}'::jsonb) - 'micronutrientBackfillAt')
        || jsonb_build_object('micronutrientSources', coalesce(e.parse_meta -> 'micronutrientSources', '{}'::jsonb) - 'fiber')
  FROM _fiber f WHERE e.id = f.id;

  -- 5) Ulubione z kcal niezgodnymi z makro, które nie były jeszcze w kwarantannie.
  INSERT INTO public.food_history_repairs (user_id, batch, kind, table_name, row_id, before, after, reason)
  SELECT f.user_id, v_batch, 'favorite_quarantine', 'food_favorites', f.id, to_jsonb(f), jsonb_build_object('validation_status', 'quarantined'),
         'kcal/100 g (' || f.calories || ') niezgodne z makro: odsunięto od dopasowywania'
  FROM public.food_favorites f
  WHERE f.validation_status <> 'quarantined' AND f.name IN ('kreatyna', 'Monte White') AND f.calories = 100;

  UPDATE public.food_favorites
  SET validation_status = 'quarantined',
      validation_reason = 'kcal/100 g niezgodne z makro (naprawa historii 2026-10-27)',
      validated_at = now()
  WHERE validation_status <> 'quarantined' AND name IN ('kreatyna', 'Monte White') AND calories = 100;
END
$repair$;

-- Część 2 (batch 'history-repair-2026-10-27b'): pojedyncze niezgodności znalezione przez audyt po rozszerzeniu okna na całą historię.
DO $repair2$
DECLARE
  v_batch constant text := 'history-repair-2026-10-27b';
BEGIN
  CREATE TEMP TABLE _energy2 ON COMMIT DROP AS
  SELECT id, round(4 * coalesce(protein, 0) + 4 * coalesce(carbs, 0) + 9 * coalesce(fat, 0))::int AS mk
  FROM public.daily_food_entries
  WHERE id IN ('f4828323-0241-40d5-8bc5-54b7e458c973', '4dbdfdf7-62b1-4e5f-af3e-31575f9b9e7d',
               '93641e8b-2585-4438-8e26-337342605631', 'e31d3ade-de04-4a7d-a28c-ad1d34297f94');

  INSERT INTO public.food_history_repairs (user_id, batch, kind, table_name, row_id, before, after, reason)
  SELECT e.user_id, v_batch, 'energy_fix', 'daily_food_entries', e.id, to_jsonb(e), jsonb_build_object('calories', n.mk),
         'kcal niezgodne z makro (' || e.calories || ' vs ' || n.mk || '): ustawiono kcal z makro'
  FROM public.daily_food_entries e JOIN _energy2 n USING (id);

  UPDATE public.daily_food_entries e
  SET calories = n.mk,
      parse_meta = coalesce(e.parse_meta, '{}'::jsonb)
        || jsonb_build_object('energy_corrected_from', e.calories, 'energy_corrected_at', now(), 'energy_corrected_by', v_batch)
  FROM _energy2 n WHERE e.id = n.id;

  INSERT INTO public.food_history_repairs (user_id, batch, kind, table_name, row_id, before, after, reason)
  SELECT e.user_id, v_batch, 'micronutrient_fix', 'daily_food_entries', e.id, to_jsonb(e), jsonb_build_object('amount', '1 porcja'),
         'ilość 7 g niemożliwa przy 358 kcal (51 kcal/g): masa nieznana, ustawiono 1 porcja'
  FROM public.daily_food_entries e WHERE e.id = 'd66e085a-6676-413a-aa4e-70a8369639f5' AND e.amount = '7 g';

  UPDATE public.daily_food_entries SET amount = '1 porcja',
         parse_meta = coalesce(parse_meta, '{}'::jsonb) || jsonb_build_object('amount_corrected_from', '7 g', 'amount_corrected_by', v_batch)
  WHERE id = 'd66e085a-6676-413a-aa4e-70a8369639f5' AND amount = '7 g';
END
$repair2$;
