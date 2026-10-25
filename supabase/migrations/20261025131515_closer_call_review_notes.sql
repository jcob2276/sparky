ALTER TABLE public.closer_calls ADD COLUMN review_notes text NOT NULL DEFAULT '';
ALTER TABLE public.closer_calls ADD CONSTRAINT closer_calls_review_notes_length CHECK (char_length(review_notes) <= 10000);
COMMENT ON COLUMN public.closer_calls.review_notes IS 'Własne wnioski użytkownika do rozmowy; webhook i analiza AI ich nie nadpisują.';

