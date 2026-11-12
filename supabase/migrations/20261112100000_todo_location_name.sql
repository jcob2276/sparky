-- Miejsce zadania (np. "Biedronka Mokotów"): nazwa wpisana przez użytkownika, pokazywana w wierszu
-- i otwierana w Mapach. Bez współrzędnych i geofence - te wymagają osobnego konsumenta.
alter table public.todo_items
  add column if not exists location_name text
    check (location_name is null or char_length(location_name) <= 200);

comment on column public.todo_items.location_name is 'Nazwa miejsca zadania wpisana przez użytkownika (max 200 znaków).';
