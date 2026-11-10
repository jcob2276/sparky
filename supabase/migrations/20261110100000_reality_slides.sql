-- Slajd: deklaracja użytkownika „dokąd zmierzam, jaki wariant wybieram".
-- To deklaracja, nie pomiar: aplikacja jej nie ocenia i nie orzeka, że się spełniła.
-- Zmiana tworzy nową wersję (stara dostaje retired_at), więc historia zostaje.

create table if not exists public.reality_slides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  statement text not null default '' check (char_length(statement) <= 600),
  process_steps text[] not null default '{}' check (cardinality(process_steps) <= 3),
  created_at timestamptz not null default timezone('utc', now()),
  retired_at timestamptz
);

-- Najwyżej jeden aktywny slajd na użytkownika.
create unique index if not exists reality_slides_one_active
  on public.reality_slides (user_id) where retired_at is null;
create index if not exists reality_slides_user_created
  on public.reality_slides (user_id, created_at desc);

alter table public.reality_slides enable row level security;

drop policy if exists reality_slides_owner_read on public.reality_slides;
create policy reality_slides_owner_read on public.reality_slides
  for select to authenticated using (user_id = (select auth.uid()));

-- Zapis wyłącznie przez funkcję poniżej (atomowa zmiana wersji).
revoke all on public.reality_slides from anon, authenticated;
grant select on public.reality_slides to authenticated;

create or replace function public.set_reality_slide(
  p_title text,
  p_statement text,
  p_process_steps text[]
) returns public.reality_slides
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_steps text[];
  v_row public.reality_slides;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  select coalesce(array_agg(btrim(s)), '{}') into v_steps
    from unnest(coalesce(p_process_steps, '{}')) as s
   where btrim(s) <> '';
  update public.reality_slides
     set retired_at = timezone('utc', now())
   where user_id = v_user and retired_at is null;
  insert into public.reality_slides (user_id, title, statement, process_steps)
  values (v_user, btrim(p_title), coalesce(p_statement, ''), v_steps)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.set_reality_slide(text, text, text[]) from public, anon;
grant execute on function public.set_reality_slide(text, text, text[]) to authenticated;
