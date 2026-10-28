-- Polityka RLS wywoływała auth.uid() osobno dla każdego wiersza (advisor auth_rls_initplan, niezmiennik w
-- scripts/ops/check-db-invariants.mjs). Ta sama reguła dostępu, opakowana w (select ...).
ALTER POLICY "Users manage own device signals" ON public.device_signal_events
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
