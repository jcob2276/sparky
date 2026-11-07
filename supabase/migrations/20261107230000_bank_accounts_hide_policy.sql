-- Ukryty rachunek (bank_accounts.hidden) nie ma być widoczny dla aplikacji. Filtr w polityce RLS działa od razu
-- także dla starszych wersji klienta, które o fladze hidden jeszcze nie wiedzą.
alter policy bank_accounts_read_own on public.bank_accounts
  using (user_id = (select auth.uid()) and not hidden);
