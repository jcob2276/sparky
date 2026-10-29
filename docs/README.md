# Dokumentacja Sparky

## Na start

Czytaj [AGENTS](../AGENTS.md), [bieżący handoff](agent/ACTIVE_WORK.md) i krótkie
[lessons](../lessons.md), potem wyłącznie dokument właściwy dla zadania.
Opis dla użytkownika i uruchomienie: [README](../README.md).
Otwarte prace: [BACKLOG](../BACKLOG.md); kierunek produktu: [KIERUNEK](direction/KIERUNEK.md).

## Właściciele informacji

| Potrzeba | Dokument |
|---|---|
| Przepływ danych i granice systemu | [ARCHITECTURE](ARCHITECTURE.md) |
| Właściciel celu, progu, definicji | [SINGLE_SOURCE](SINGLE_SOURCE.md) — przed wpisaniem liczby do kodu/promptu |
| Czytelnicy i pisarze tabel | [DATA_MAP](DATA_MAP.md) — generowana mapa, przed usuwaniem danych/kodu |
| Funkcje, triggery, JWT, tabele | [Rejestr backendu](../supabase/functions/README.md) i generowany [FUNCTIONS](../supabase/functions/FUNCTIONS.md) |
| Zmiana backendu | [BACKEND_CONTRACT](BACKEND_CONTRACT.md) |
| Zmiana frontendu | [FRONTEND_GUIDE](FRONTEND_GUIDE.md) |
| Wygląd, komponenty i tokeny UI | [DESIGN_SYSTEM](DESIGN_SYSTEM.md) |
| Granice wnioskowania i zapisu AI | [PRODUCT_PRINCIPLES](PRODUCT_PRINCIPLES.md) |
| Nazwy w produkcie | [PRODUCT_LANGUAGE](PRODUCT_LANGUAGE.md) |
| Obecne moduły i wejścia | [VANGUARD_STATE](VANGUARD_STATE.md) |
| Aktywne, wyłączone i usunięte ścieżki | [FEATURE_LIFECYCLE](FEATURE_LIFECYCLE.md) |
| Migracje i odtwarzanie bazy | [Migracje](../supabase/migrations/README.md) |
| Polecenia, testy i narzędzia | [scripts](../scripts/README.md), [CONTRIBUTING](../CONTRIBUTING.md) |
| Incydent / deploy | [runbooks](runbooks/) |
| Powierzchnie biometryczne | [BIOMETRICS](surface-contracts/BIOMETRICS.md) |
| Zmiana modułu jedzenia | [Benchmark trackerów](research/food-trackers-benchmark.md) — materiał referencyjny, nie kolejka |
| Kontekst pracy/sprzedaży | [career](career/) — treści domenowe, nie instrukcje globalne |

## Hierarchia i utrzymanie

W razie sprzeczności: AGENTS → ARCHITECTURE → rejestr funkcji →
BACKEND_CONTRACT → FRONTEND_GUIDE → pozostałe dokumenty właściwe dla zadania.
Aktualny kod ustala stan implementacji; dokument nie dowodzi wdrożenia.

Jeden temat ma jednego właściciela. Pozostałe pliki linkują do niego.
Nowy dokument powstaje wyłącznie, gdy żaden istniejący nie pasuje.
Plan sesyjny żyje w ACTIVE_WORK, otwarte punkty w BACKLOG, historia w Git.
Nie kopiuj inwentarzy, liczników, wersji i wyników dawnych testów do instrukcji.
