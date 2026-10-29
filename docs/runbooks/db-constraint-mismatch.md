# Niezgodność constraintu DB

Objaw: brak zapisu mimo odpowiedzi HTTP albo błąd Postgres CHECK/enum.
Nie odtwarzaj dawnych INSERT-ów z dokumentacji — ustal tabelę, payload, rolę i
rzeczywisty `error` z kodu/logów. Supabase JS zwraca `{error}` bez throw.

W SQL Editor sprawdź definicje (podmień nazwę tabeli):

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.daily_reconciliations'::regclass;
```

Dla `daily_reconciliations.planning_status` legalne wartości to
`pending | active | completed`, nie `done`. Inne statusy sprawdzaj w schemacie i migracjach,
a nie w historycznych przykładach.

Popraw caller lub dodaj uzasadnioną [migrację](../../supabase/migrations/README.md),
zanim kod zacznie wysyłać nową wartość. Sprawdź RLS, NOT NULL i FK oraz test błędnej
wartości; odpowiedź sukcesu musi odpowiadać rzeczywistemu zapisowi.
