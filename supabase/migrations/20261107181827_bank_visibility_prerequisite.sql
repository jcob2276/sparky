-- Kolejność świeżego odtworzenia: widok finansów korzysta z flagi przed starszą migracją
-- o późniejszym identyfikatorze. Nie zmieniamy już zastosowanych plików ani ich wersji.
alter table public.bank_accounts add column if not exists hidden boolean not null default false;
