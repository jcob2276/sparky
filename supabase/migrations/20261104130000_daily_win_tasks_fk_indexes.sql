-- Indeksy na kluczach obcych daily_win_tasks (kpi_id, project_id).
-- Postgres nie indeksuje FK automatycznie; bez nich ON DELETE/UPDATE na kpi i projektach
-- skanuje całą tabelę (supabase-postgres-best-practices, schema-foreign-key-indexes).
-- Audyt żywej bazy 2026-11-04: to jedyne dwa FK w public bez indeksu wiodącego.
CREATE INDEX IF NOT EXISTS daily_win_tasks_kpi_id_idx ON public.daily_win_tasks (kpi_id);
CREATE INDEX IF NOT EXISTS daily_win_tasks_project_id_idx ON public.daily_win_tasks (project_id);
