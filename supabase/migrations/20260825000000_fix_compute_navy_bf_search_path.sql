-- Naprawa bledu 'relation nutrition_profile does not exist' spowodowanego
-- brakiem search_path w funkcji SECURITY DEFINER.

CREATE OR REPLACE FUNCTION "public"."compute_navy_bf"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = public
    AS $$
DECLARE
  v_height numeric;
  v_sex    text;
  v_bf     numeric;
  v_diff   numeric;
BEGIN
  -- Wymagane: neck + waist
  IF NEW.neck IS NULL OR NEW.waist IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT height_cm, UPPER(COALESCE(sex, 'M'))
  INTO v_height, v_sex
  FROM public.nutrition_profile
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF v_height IS NULL OR v_height <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_sex = 'F' AND NEW.hips IS NOT NULL THEN
    v_diff := NEW.waist + NEW.hips - NEW.neck;
    IF v_diff <= 0 THEN RETURN NEW; END IF;
    v_bf := 495.0 / (1.29579 - 0.35004 * LOG(v_diff) + 0.22100 * LOG(v_height)) - 450.0;
  ELSE
    v_diff := NEW.waist - NEW.neck;
    IF v_diff <= 0 THEN RETURN NEW; END IF;
    v_bf := 495.0 / (1.0324 - 0.19077 * LOG(v_diff) + 0.15456 * LOG(v_height)) - 450.0;
  END IF;

  -- Sanity clamp 3–50%
  v_bf := GREATEST(3.0, LEAST(50.0, ROUND(v_bf::numeric, 1)));
  NEW.body_fat := v_bf;

  RETURN NEW;
END;
$$;
