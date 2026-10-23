# Retencja danych /inwestycje (tylko bieżący rok)

Baza trzyma dane inwestycyjne od 1 stycznia bieżącego roku (Europe/Warsaw). Migracja
`supabase/migrations/20261023120000_investments_current_year_retention.sql` dodaje
`public.prune_investments_before_year()`; ingest (edge functions) ma tę samą podłogę
(`supabase/functions/_shared/yearFloor.ts`, lustro `src/lib/investments/yearFloor.ts`).

## Co jest usuwane (pomiar 2026-10-23)

| Tabela | Reguła | Wierszy do usunięcia | ~MB |
|---|---|---|---|
| prices_daily | `date` < 1 stycznia | 85 396 z 173 578 | 27.7 |
| us_financial_reports | `publication_date` i `period_end` < 1 stycznia | 33 193 z 48 797 | 29.7 |
| stock_act_trades | `transaction_date` i `disclosure_date` < 1 stycznia | 43 244 z 48 473 | 18.0 |
| sec13f_positions | filing z `period_of_report` < 1 stycznia, poza baseline | 24 437 z 34 777 | 8.4 |
| filings (13F) | jw. | 450 z 634 | 0.2 |
| knf_disclosed_positions | `position_date` < 1 stycznia, poza pozycjami z knf_current_positions | 1 840 z 2 278 | 1.6 |
| insider_trades | `transaction_date` i `filing_date` < 1 stycznia | 0 z 11 674 | 0 |
| sec_form4_filings | `filing_date` < 1 stycznia, status processed | 0 z 4 841 | 0 |

Razem ok. 85 MB z ok. 160 MB (szacunek proporcjonalny do liczby wierszy, z indeksami).
`insider_trades` waży 21 MB przez `raw_data`; retencja jej nie zmniejszy (288 starszych transakcji
zgłoszono w 2026, więc zostają). Poza zakresem: gpw_financial_reports, knf_current_positions,
knf_short_snapshots, house/senate_disclosures, us_security_catalogue.

## Kompromis 13F (Q-over-Q)

Porównanie kwartał do kwartału potrzebuje poprzedniego kwartału. W styczniu i lutym bieżący rok nie ma
jeszcze raportów 13F (termin Q4 to 14 lutego), a Q1 porównuje się z Q4 aż do sierpnia. Dlatego domyślnie
`p_keep_13f_baseline = true`: dla każdego funduszu zostaje najnowszy raport sprzed 1 stycznia
(wszystkie jego poprawki), ok. 3,4 tys. pozycji (~1,2 MB). `prune_investments_before_year(p_keep_13f_baseline => false)`
usuwa też baseline, ale zmiany Q1 vs Q4 przestaną się liczyć do czasu raportów Q2. UI w styczniu/lutym ma
pokazywać stan pustki "dane od 1 stycznia" zamiast porównania.

## Jak zastosować (robisz to sam, najpierw na kopii)

1. Utwórz branch Supabase (lub przywróć kopię) i zastosuj tam migrację: `supabase db push` na branchu.
   Nie stosuj na produkcji przed krokiem 3.
2. Na branchu: `select public.prune_investments_before_year();` i porównaj zwrócone liczby z tabelą wyżej.
3. Sprawdź aplikację na branchu (`/inwestycje`, wszystkie zakładki), potem zrób kopię zapasową produkcji
   (Dashboard > Database > Backups) i zastosuj migrację na produkcji.
4. Migracja tylko tworzy funkcję, harmonogram `investments-year-retention` (pg_cron, 2. dnia miesiąca 04:00 UTC,
   w tym 2 stycznia) i poprawia warunek jobu `sync-us-price-history` (zamiast "wiersz sprzed 375 dni" używa
   podłogi roku, inaczej job w kółko dociągałby historię). Pierwsze usunięcie nastąpi dopiero przy wywołaniu
   funkcji lub w najbliższym terminie crona; chcąc uniknąć niespodzianki, wywołaj ją ręcznie i od razu
   `select cron.unschedule('investments-year-retention')` jeśli wolisz sterować ręcznie.
5. Wdróż edge functions (`sync`, `sync-insider-trades`; patrz deploy-edge-function.md), żeby backfill nie wciągał starych danych.

## Odzyskanie miejsca (po prune)

`DELETE` nie zmniejsza plików; autovacuum tylko udostępnia miejsce ponownie. Żeby je faktycznie oddać:

```sql
-- Blokuje tabelę (ACCESS EXCLUSIVE) na czas przepisywania: uruchom poza godzinami crona, najlepiej pojedynczo.
VACUUM (FULL, ANALYZE) public.prices_daily;
VACUUM (FULL, ANALYZE) public.us_financial_reports;
VACUUM (FULL, ANALYZE) public.stock_act_trades;
VACUUM (FULL, ANALYZE) public.sec13f_positions;
VACUUM (FULL, ANALYZE) public.filings;
VACUUM (FULL, ANALYZE) public.knf_disclosed_positions;
```

`VACUUM FULL` nie działa w transakcji (SQL Editor w Dashboard często owija w transakcję: użyj `psql`/CLI).
Wymaga wolnego miejsca na kopię tabeli (największa: prices_daily ~56 MB). Alternatywa bez długiej blokady:
`pg_repack` (rozszerzenie dostępne). Rozmiar sprawdzisz:
`select relname, pg_size_pretty(pg_total_relation_size(oid)) from pg_class where relnamespace='public'::regnamespace and relkind='r' order by pg_total_relation_size(oid) desc limit 10;`

## Rollback

Dane usunięte funkcją wracają tylko z backupu/PITR. Backfill wstecz wymaga zdjęcia podłogi w edge functions
(`yearFloor.ts`, `sec13fPeriodFloor`), więc nie wróci przypadkiem.
