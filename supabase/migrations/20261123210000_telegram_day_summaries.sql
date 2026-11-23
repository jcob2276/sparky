-- Podsumowanie dnia z wiadomości i głosówek z Telegrama, pokazywane w domknięciu dnia.
-- Zapisuje je funkcja telegram-day-summary (service role); odświeża się tylko, gdy dojdą nowe wiadomości.
create table if not exists public.telegram_day_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  bullets jsonb not null check (jsonb_typeof(bullets) = 'array' and jsonb_array_length(bullets) <= 8),
  message_count integer not null check (message_count >= 0),
  voice_seconds integer not null default 0 check (voice_seconds >= 0),
  last_message_at timestamptz not null,
  generated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.telegram_day_summaries enable row level security;

create policy "Owner reads own telegram day summaries"
  on public.telegram_day_summaries
  for select
  to authenticated
  using (user_id = (select auth.uid()));
