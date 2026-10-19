-- Meal photos: one photo per captured meal (meal_group_id == daily_food_entries.meal_group_id).
create table if not exists public.nutrition_meal_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_group_id uuid not null,
  storage_path text not null unique,
  mime_type text not null default 'image/jpeg',
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, meal_group_id)
);

create index if not exists idx_nutrition_meal_photos_user_created
  on public.nutrition_meal_photos (user_id, created_at desc);

alter table public.nutrition_meal_photos enable row level security;
grant select, insert, update, delete on public.nutrition_meal_photos to authenticated;

create policy "Users manage own meal photos"
  on public.nutrition_meal_photos
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('meal-photos', 'meal-photos', false, 5242880)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy "Users read own meal photo files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users upload own meal photo files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete own meal photo files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
