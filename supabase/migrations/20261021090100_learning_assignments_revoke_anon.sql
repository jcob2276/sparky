-- New tables inherit broad default privileges for anon. RLS already denies anon (policies are TO authenticated);
-- revoke anyway so the grants match the intent (see lessons.md: new per-user tables).
REVOKE ALL ON public.learning_assignments FROM anon;
REVOKE ALL ON public.learning_progress_log FROM anon;
