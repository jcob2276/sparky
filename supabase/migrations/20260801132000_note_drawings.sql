begin;

create table if not exists public.note_drawings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null unique references public.vanguard_notes(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version >= 1),
  document jsonb not null,
  preview_storage_path text,
  ocr_text text,
  width integer not null check (width between 1 and 20000),
  height integer not null check (height between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.note_drawings enable row level security;
grant select, insert, update, delete on public.note_drawings to authenticated;
create policy "Users manage own note drawings" on public.note_drawings
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_note_drawings_user_updated
  on public.note_drawings(user_id, updated_at desc);

create or replace function public.enforce_note_drawing_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.vanguard_notes n
    where n.id = new.note_id and n.user_id = new.user_id
  ) then raise exception 'Drawing note must belong to the same user'; end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_note_drawing_owner on public.note_drawings;
create trigger trg_enforce_note_drawing_owner
before insert or update of note_id, user_id on public.note_drawings
for each row execute function public.enforce_note_drawing_owner();

commit;
