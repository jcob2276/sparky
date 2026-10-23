-- Retencja /inwestycje: baza trzyma tylko dane z bieżącego roku (od 1 stycznia, Europe/Warsaw).
--
-- UWAGA: plik NIE jest zastosowany. Zastosuj go najpierw na branchu/kopii (docs/runbooks/investments-retention.md).
--
-- Pomiar z 2026-10-23 (project pdvqkgfsqziqlhptatgf, schemat public; "orca" to tabele inwestycyjne w public):
--   tabela                    kolumna daty (reguła)                         do usunięcia / razem   ~MB do odzyskania
--   prices_daily              date                                          85 396 / 173 578       ~27.7
--   us_financial_reports      publication_date i period_end                 33 193 /  48 797       ~29.7
--   stock_act_trades          transaction_date i disclosure_date            43 244 /  48 473       ~18.0
--   sec13f_positions          filings.period_of_report (bez baseline)       24 437 /  34 777       ~8.4
--   filings                   period_of_report (bez baseline)                  450 /     634       ~0.2
--   knf_disclosed_positions   position_date (bez pozycji z knf_current)      1 840 /   2 278       ~1.6
--   insider_trades            transaction_date i filing_date                     0 /  11 674       0 (patrz niżej)
--   sec_form4_filings         filing_date                                        0 /   4 841       0
--   Razem (szacunek proporcjonalny do liczby wierszy, razem z indeksami): ~85 MB z ~160 MB.
--   Faktyczny zysk widać dopiero po VACUUM FULL / pg_repack (zwykły DELETE nie zwalnia miejsca dla systemu plików).
--
-- Reguły "superset" (usuwamy tylko to, co jest stare WEDŁUG OBU dat), żeby filtr UI po którejkolwiek z dat nie widział dziur:
--   * insider_trades: 288 transakcji sprzed 2026 zgłoszono w 2026 (filing_date) - zostają, stąd 0 do usunięcia.
--     Tabela waży 21 MB przez raw_data jsonb; retencja jej nie zmniejszy.
--   * stock_act_trades: transakcja z grudnia ujawniona w styczniu zostaje.
--   * us_financial_reports: raport za FY2025 opublikowany w lutym 2026 zostaje; spółka bez publikacji w tym roku traci finanse.
--
-- Kompromis 13F (Q-over-Q): porównanie kwartał do kwartału potrzebuje poprzedniego kwartału. W styczniu/lutym
--   bieżący rok nie ma jeszcze żadnego raportu (13F za Q4 spływa do 14 lutego), a Q1 porównuje się z Q4 poprzedniego roku
--   aż do sierpnia. Dlatego domyślnie (p_keep_13f_baseline = true) zostawiamy dla każdego funduszu NAJNOWSZY raport
--   (wszystkie jego wersje/poprawki) z okresu sprzed 1 stycznia jako 'baseline'. Koszt: ~3,4 tys. pozycji (~1,2 MB).
--   Wywołanie z false usuwa też baseline - wtedy zmiany Q1 vs Q4 nie policzą się do czasu raportów Q2.
--
-- Zależności sprawdzone: sec13f_positions.filing_id -> filings(id) ON DELETE CASCADE (jedyny FK do filings);
--   stock_act_trades.politician_id -> politicians (nie ruszamy politicians); brak triggerów na usuwanych tabelach;
--   widoki vw_sec13f_* i vw_insider_public / vw_sec_form4_public czytają tabele bazowe - nie wymagają zmian.
--   Poza zakresem celowo: gpw_financial_reports (260 wierszy, 0,6 MB, widok gpw_latest_annual_reports potrzebuje roku poprzedniego),
--   knf_current_positions, knf_short_snapshots, house/senate_disclosures (już tylko 2026), us_security_catalogue (katalog, nie historia).

CREATE OR REPLACE FUNCTION public.prune_investments_before_year(
  p_floor date DEFAULT (date_trunc('year', timezone('Europe/Warsaw', now())))::date,
  p_keep_13f_baseline boolean DEFAULT true,
  p_batch_size integer DEFAULT 5000
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = '10min'
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_n bigint;
  v_total bigint;
BEGIN
  IF p_batch_size < 100 OR p_batch_size > 50000 THEN
    RAISE EXCEPTION 'p_batch_size must be between 100 and 50000';
  END IF;
  -- Bezpiecznik: nigdy nie ucinaj bieżącego roku ani przyszłości.
  IF p_floor > (date_trunc('year', timezone('Europe/Warsaw', now())))::date THEN
    RAISE EXCEPTION 'p_floor % is after the current year start', p_floor;
  END IF;

  -- prices_daily
  v_total := 0;
  LOOP
    DELETE FROM public.prices_daily WHERE ctid = ANY (ARRAY(
      SELECT ctid FROM public.prices_daily WHERE date < p_floor LIMIT p_batch_size));
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n; EXIT WHEN v_n < p_batch_size;
  END LOOP;
  v_result := v_result || jsonb_build_object('prices_daily', v_total);

  -- us_financial_reports
  v_total := 0;
  LOOP
    DELETE FROM public.us_financial_reports WHERE ctid = ANY (ARRAY(
      SELECT ctid FROM public.us_financial_reports
      WHERE coalesce(publication_date, period_end) < p_floor AND coalesce(period_end, publication_date) < p_floor
      LIMIT p_batch_size));
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n; EXIT WHEN v_n < p_batch_size;
  END LOOP;
  v_result := v_result || jsonb_build_object('us_financial_reports', v_total);

  -- stock_act_trades (Kongres USA)
  v_total := 0;
  LOOP
    DELETE FROM public.stock_act_trades WHERE ctid = ANY (ARRAY(
      SELECT ctid FROM public.stock_act_trades
      WHERE coalesce(greatest(transaction_date, disclosure_date), transaction_date, disclosure_date) < p_floor
      LIMIT p_batch_size));
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n; EXIT WHEN v_n < p_batch_size;
  END LOOP;
  v_result := v_result || jsonb_build_object('stock_act_trades', v_total);

  -- insider_trades (Form 4)
  v_total := 0;
  LOOP
    DELETE FROM public.insider_trades WHERE ctid = ANY (ARRAY(
      SELECT ctid FROM public.insider_trades
      WHERE coalesce(greatest(transaction_date, filing_date), transaction_date, filing_date, created_at::date) < p_floor
      LIMIT p_batch_size));
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n; EXIT WHEN v_n < p_batch_size;
  END LOOP;
  v_result := v_result || jsonb_build_object('insider_trades', v_total);

  -- sec_form4_filings (kolejka/ślad pobrań; tylko przetworzone)
  v_total := 0;
  LOOP
    DELETE FROM public.sec_form4_filings WHERE ctid = ANY (ARRAY(
      SELECT ctid FROM public.sec_form4_filings
      WHERE filing_date < p_floor AND status = 'processed' LIMIT p_batch_size));
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n; EXIT WHEN v_n < p_batch_size;
  END LOOP;
  v_result := v_result || jsonb_build_object('sec_form4_filings', v_total);

  -- knf_disclosed_positions (nie ruszamy pozycji nadal widocznych w knf_current_positions)
  v_total := 0;
  LOOP
    DELETE FROM public.knf_disclosed_positions WHERE ctid = ANY (ARRAY(
      SELECT d.ctid FROM public.knf_disclosed_positions d
      WHERE d.position_date < p_floor
        AND NOT EXISTS (SELECT 1 FROM public.knf_current_positions c WHERE c.external_id = d.external_id)
      LIMIT p_batch_size));
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n; EXIT WHEN v_n < p_batch_size;
  END LOOP;
  v_result := v_result || jsonb_build_object('knf_disclosed_positions', v_total);

  -- 13F: raporty sprzed p_floor, z zachowaniem baseline (najnowszy okres < p_floor na fundusz).
  CREATE TEMP TABLE _prune_13f_filings ON COMMIT DROP AS
    SELECT f.id FROM public.filings f
    WHERE f.period_of_report < p_floor
      AND (NOT p_keep_13f_baseline OR f.period_of_report < (
        SELECT max(f2.period_of_report) FROM public.filings f2
        WHERE f2.investor_id = f.investor_id AND f2.period_of_report < p_floor));
  v_total := 0;
  LOOP
    DELETE FROM public.sec13f_positions WHERE ctid = ANY (ARRAY(
      SELECT p.ctid FROM public.sec13f_positions p JOIN _prune_13f_filings t ON t.id = p.filing_id LIMIT p_batch_size));
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n; EXIT WHEN v_n < p_batch_size;
  END LOOP;
  v_result := v_result || jsonb_build_object('sec13f_positions', v_total);
  DELETE FROM public.filings WHERE id IN (SELECT id FROM _prune_13f_filings);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_result := v_result || jsonb_build_object('filings', v_n, 'floor', p_floor, 'keep_13f_baseline', p_keep_13f_baseline);
  DROP TABLE _prune_13f_filings;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.prune_investments_before_year(date, boolean, integer) IS
  'Usuwa dane inwestycyjne sprzed 1 stycznia (Europe/Warsaw) w partiach; zwraca liczby usuniętych wierszy. 13F: zostawia baseline per fund. Po wykonaniu zrób VACUUM FULL (docs/runbooks/investments-retention.md).';

REVOKE ALL ON FUNCTION public.prune_investments_before_year(date, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_investments_before_year(date, boolean, integer) TO service_role;

-- Harmonogram: 2. dnia każdego miesiąca o 04:00 UTC (obejmuje 2 stycznia, gdy zaczyna się nowy rok).
-- Zwykły DELETE nie zmniejsza pliku; autovacuum tylko wykorzystuje miejsce ponownie.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron niedostępne - pomijam harmonogram prune_investments_before_year';
  ELSE
    PERFORM cron.schedule('investments-year-retention', '0 4 2 * *', 'SELECT public.prune_investments_before_year()');
  END IF;
END $$;

-- Ingest: dotychczasowy job sync-us-price-history pobiera historię '2y' dopóki ticker nie ma wiersza sprzed 375 dni.
-- Po retencji taki wiersz nie istnieje, więc job w kółko dociągałby (i teraz odfiltrowywał) dane. Warunek wg roku.
DO $$
DECLARE v_cmd text;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN; END IF;
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'sync-us-price-history';
  IF v_cmd IS NOT NULL AND position('p.date <= current_date-375' IN v_cmd) > 0 THEN
    PERFORM cron.alter_job(
      (SELECT jobid FROM cron.job WHERE jobname = 'sync-us-price-history'),
      command := replace(v_cmd, 'p.date <= current_date-375',
        'p.date <= least(current_date-3, (date_trunc(''year'', timezone(''Europe/Warsaw'', now())))::date + 7)'));
  END IF;
END $$;
