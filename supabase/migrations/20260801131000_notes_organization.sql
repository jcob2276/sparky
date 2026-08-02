begin;

alter table public.note_folders
  add column if not exists parent_id uuid references public.note_folders(id) on delete restrict,
  add column if not exists position integer not null default 0;

alter table public.note_folders
  drop constraint if exists note_folders_not_self_parent;
alter table public.note_folders
  add constraint note_folders_not_self_parent check (id <> parent_id);

with ranked as (
  select id, row_number() over (partition by user_id, parent_id order by name, id) - 1 as next_position
  from public.note_folders
)
update public.note_folders f set position = ranked.next_position
from ranked where ranked.id = f.id;

create index if not exists idx_note_folders_user_parent_position
  on public.note_folders(user_id, parent_id, position, id);

create or replace function public.enforce_note_folder_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_owner uuid;
  cycle_found boolean;
begin
  if new.parent_id is null then return new; end if;
  select user_id into parent_owner from public.note_folders where id = new.parent_id;
  if parent_owner is distinct from new.user_id then
    raise exception 'Parent folder must belong to the same user';
  end if;
  with recursive ancestors as (
    select id, parent_id from public.note_folders where id = new.parent_id
    union all
    select f.id, f.parent_id from public.note_folders f join ancestors a on f.id = a.parent_id
  )
  select exists(select 1 from ancestors where id = new.id) into cycle_found;
  if cycle_found then raise exception 'Folder hierarchy cannot contain a cycle'; end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_note_folder_hierarchy on public.note_folders;
create trigger trg_enforce_note_folder_hierarchy
before insert or update of parent_id, user_id on public.note_folders
for each row execute function public.enforce_note_folder_hierarchy();

create or replace function public.delete_note_folder_hierarchy(folder_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid;
  destination_id uuid;
begin
  select user_id, parent_id into owner_id, destination_id
  from public.note_folders where id = folder_id for update;
  if owner_id is null or owner_id <> (select auth.uid()) then
    raise exception 'Folder not found';
  end if;
  update public.vanguard_notes set folder_id = destination_id
    where user_id = owner_id and folder_id = delete_note_folder_hierarchy.folder_id;
  update public.note_folders set parent_id = destination_id
    where user_id = owner_id and parent_id = delete_note_folder_hierarchy.folder_id;
  delete from public.note_folders where id = delete_note_folder_hierarchy.folder_id;
end;
$$;

grant execute on function public.delete_note_folder_hierarchy(uuid) to authenticated;

create table if not exists public.note_smart_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0,
  rule jsonb not null check ((rule->>'version') = '1'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

alter table public.note_smart_folders enable row level security;
grant select, insert, update, delete on public.note_smart_folders to authenticated;
create policy "Users manage own smart folders" on public.note_smart_folders
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create index if not exists idx_note_smart_folders_user_position
  on public.note_smart_folders(user_id, position, id);

commit;
