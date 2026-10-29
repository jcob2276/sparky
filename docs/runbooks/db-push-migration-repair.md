# Rozjazd historii migracji

Objaw: `Remote migration versions not found in local migrations directory` albo
`npm run db:check-drift` wskazuje wersje obecne tylko po jednej stronie.

1. Uruchom `npm run db:check-drift` i `supabase migration list --linked`.
2. Porównaj pliki lokalne, ledger i rzeczywisty schemat. Rozróżnij niezastosowany SQL
   od tego samego SQL zapisanego przez inne narzędzie pod innym timestampem.
3. Dla nowej lokalnej migracji użyj [db:apply](../../supabase/migrations/README.md).
   Nie wykonuj zbiorczego `db push`, dopóki nie rozumiesz każdej pozycji planu.
4. `supabase migration repair --linked --status applied|reverted <wersja>` zmienia
   **zdalny ledger, nie schemat**. Użyj tylko po dowodzie, jaki SQL wykonano i dlaczego
   wpis jest błędny; najpierw zapewnij backup. Nie oznaczaj wszystkich remote-only jako
   reverted tylko dlatego, że CLI zasugerowało listę.
5. Po naprawie porównaj ponownie ledger i schemat oraz uruchom `npm run db:check-drift`.

Nie uruchamiaj produkcyjnego `db reset`, nie kasuj ręcznie ledgeru i nie zmieniaj nazw
zastosowanych migracji. `db pull` może wygenerować duży diff — odbierz go przed dalszym
zastosowaniem. Nie obchodź procedury przez SQL Editor/MCP z nowym timestampem.
