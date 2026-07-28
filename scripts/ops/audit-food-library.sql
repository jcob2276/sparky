SELECT
  user_id,
  name,
  brand,
  source,
  calories,
  protein,
  carbs,
  fat,
  default_grams,
  validation_status,
  validation_reason,
  round((protein * 4 + carbs * 4 + fat * 9)::numeric, 1) AS macro_kcal,
  round(abs(calories - (protein * 4 + carbs * 4 + fat * 9))::numeric, 1) AS kcal_gap
FROM public.food_library
WHERE
  validation_status = 'quarantined'
  OR calories <= 0
  OR default_grams <= 0
  OR abs(calories - (protein * 4 + carbs * 4 + fat * 9))
    > greatest(25, calories * 0.20)
ORDER BY validation_status DESC, kcal_gap DESC, name;
