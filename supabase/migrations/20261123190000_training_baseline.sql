-- Pomiary wstępne od trenera: wyniki testów (główna seria, max) i wideo, po jednym wierszu na test.
create table if not exists public.training_baseline_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  test_key text not null check (char_length(test_key) between 1 and 40),
  main_set text check (main_set is null or char_length(main_set) <= 200),
  max_value text check (max_value is null or char_length(max_value) <= 200),
  skipped boolean not null default false,
  video_path text,
  video_url text check (video_url is null or char_length(video_url) <= 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, test_key)
);

alter table public.training_baseline_results enable row level security;
grant select, insert, update, delete on public.training_baseline_results to authenticated;

create policy "Users manage own baseline results"
  on public.training_baseline_results
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Prywatny magazyn na nagrania (limit 50 MB na plik: tyle pozwala plan Supabase).
insert into storage.buckets (id, name, public, file_size_limit)
values ('baseline-videos', 'baseline-videos', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy "Users read own baseline videos"
  on storage.objects for select to authenticated
  using (bucket_id = 'baseline-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload own baseline videos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'baseline-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete own baseline videos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'baseline-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
