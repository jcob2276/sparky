-- Rozdzielenie „moich słów” od automatów w vanguard_stream.
-- origin = 'user'   - tekst napisany lub podyktowany przez użytkownika (Telegram, zamknięcie dnia, log nawyku, odpowiedź na briefing)
--          'import' - długie materiały z zewnątrz (np. transkrypcje sesji)
--          'system' - pytania, podsumowania, alerty, kopie Power List i pozostałe automaty
-- Kolumna jest wyliczana ze source, więc żaden zapis ani import nie musi jej ustawiać.
-- Podsumowania liczące „co napisałem” filtrują: origin = 'user' and classification is distinct from 'redundant'.

create or replace function public.vanguard_stream_origin(src text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when src in ('telegram', 'daily_shutdown', 'habit_log', 'user_prompt', 'briefing_response') then 'user'
    when src = 'hypnotherapy_session' then 'import'
    else 'system'
  end
$$;

alter table public.vanguard_stream
  add column if not exists origin text
  generated always as (public.vanguard_stream_origin(source)) stored;

comment on column public.vanguard_stream.origin is
  'user | import | system, wyliczane ze source przez vanguard_stream_origin(). Filtruj origin = ''user'', żeby liczyć tylko własne słowa.';

create index if not exists vanguard_stream_user_origin_idx
  on public.vanguard_stream (user_id, timestamp desc)
  where origin = 'user';
