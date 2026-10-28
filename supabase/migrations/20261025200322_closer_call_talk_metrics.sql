ALTER TABLE public.closer_calls ADD COLUMN IF NOT EXISTS call_metrics JSONB;
COMMENT ON COLUMN public.closer_calls.call_metrics IS 'Metryki prowadzenia rozmowy liczone z transkryptu (udział w mówieniu, najdłuższa wypowiedź, tempo, pytania); bez AI.';
