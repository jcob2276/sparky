-- Klucze obce dla relacji, które były tylko konwencją nazw (*_id bez FK).
-- Cele zweryfikowane na danych produkcyjnych 2026-10-28: daily_win_tasks.todo_id 36/36 istnieje w todo_items,
-- vanguard_entity_links.source_episode_id 227/227 istnieje w vanguard_stream, daily_win_tasks.project_id bez wartości.
-- Powiązania opcjonalne: przy usunięciu rodzica pole zeruje się (SET NULL), wiersz zostaje.
-- Pominięte celowo: pipeline_runs.run_id (to identyfikator korelacji, nie vanguard_oracle_runs),
-- core_memory_revisions.preference_id (1 z 2 wartości osierocona), kolumny w pełni puste bez pewnego rodzica.
--
-- Cofnięcie: ALTER TABLE ... DROP CONSTRAINT <nazwa>;

ALTER TABLE public.daily_win_tasks
  ADD CONSTRAINT daily_win_tasks_todo_id_fkey
  FOREIGN KEY (todo_id) REFERENCES public.todo_items (id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.daily_win_tasks VALIDATE CONSTRAINT daily_win_tasks_todo_id_fkey;

ALTER TABLE public.daily_win_tasks
  ADD CONSTRAINT daily_win_tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.daily_win_tasks VALIDATE CONSTRAINT daily_win_tasks_project_id_fkey;

ALTER TABLE public.vanguard_entity_links
  ADD CONSTRAINT vanguard_entity_links_source_episode_id_fkey
  FOREIGN KEY (source_episode_id) REFERENCES public.vanguard_stream (id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.vanguard_entity_links VALIDATE CONSTRAINT vanguard_entity_links_source_episode_id_fkey;

CREATE INDEX IF NOT EXISTS daily_win_tasks_todo_id_idx ON public.daily_win_tasks (todo_id) WHERE todo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vanguard_entity_links_source_episode_id_idx ON public.vanguard_entity_links (source_episode_id) WHERE source_episode_id IS NOT NULL;
