-- Polityki odczytu tabel bankowych wywoływały auth.uid() dla każdego wiersza. Opakowanie w (select ...)
-- pozwala planerowi policzyć je raz (initplan). Predykat jest semantycznie identyczny:
-- właściciel (user_id = auth.uid()) nadal widzi tylko swoje wiersze.
alter policy bank_connections_read_own on public.bank_connections
  using (user_id = (select auth.uid()));
alter policy bank_accounts_read_own on public.bank_accounts
  using (user_id = (select auth.uid()));
alter policy bank_transactions_read_own on public.bank_transactions
  using (user_id = (select auth.uid()));
