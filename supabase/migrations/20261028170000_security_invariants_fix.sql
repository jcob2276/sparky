-- Naprawa dwóch naruszeń wykrytych przez npm run db:check-invariants (2026-10-28).
--
-- 1) Funkcja triggera sync_lenie_behavior_log() jest SECURITY DEFINER, a domyślnie EXECUTE ma PUBLIC,
--    więc mogła ją wywołać rola anon. Trigger nie wymaga EXECUTE dla roli zapisującej wiersz.
-- 2) Polityka closer_calls_owner używała auth.uid() bez (select ...), przez co jest liczona dla każdego wiersza.
--
-- Cofnięcie: GRANT EXECUTE ON FUNCTION public.sync_lenie_behavior_log() TO PUBLIC;
--            ALTER POLICY closer_calls_owner ON public.closer_calls USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

REVOKE ALL ON FUNCTION public.sync_lenie_behavior_log() FROM PUBLIC, anon, authenticated;

ALTER POLICY closer_calls_owner ON public.closer_calls
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
