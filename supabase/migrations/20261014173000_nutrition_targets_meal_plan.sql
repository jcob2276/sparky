-- Add dedicated meal_plan column to nutrition_targets so meal planning state is persisted independently of calorie recalculations
ALTER TABLE public.nutrition_targets ADD COLUMN IF NOT EXISTS meal_plan jsonb;
