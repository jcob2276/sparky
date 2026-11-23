-- Pomiary wstępne: serie rozgrzewkowe i robocze (ciężar × powtórzenia) jako lista, nie jeden tekst.
alter table public.training_baseline_results
  add column if not exists sets jsonb
  check (sets is null or (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) <= 14));
comment on column public.training_baseline_results.sets is
  'Lista serii [{"kg": number|null, "reps": number|null}] od rozgrzewki do maksa; main_set trzyma skrót tekstowy.';
