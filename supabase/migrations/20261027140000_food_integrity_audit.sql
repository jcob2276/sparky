-- Tygodniowy samoaudyt jedzenia: znaleziska, historia przebiegów i kwarantanna błędnych ulubionych.
-- Nie zmienia żadnych wartości w istniejących wpisach; naprawy serwera są odwracalne (kwarantanna, przeliczenie sum).

CREATE TABLE IF NOT EXISTS public.food_integrity_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  kind text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warn', 'high')),
  entity_table text,
  entity_id text,
  message text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_fix text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (user_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS food_integrity_findings_user_status_idx
  ON public.food_integrity_findings (user_id, status, severity);

COMMENT ON TABLE public.food_integrity_findings IS
  'Wyniki tygodniowego audytu jedzenia (edge food-integrity-audit). Fingerprint jest stabilny: ponowny przebieg aktualizuje wiersz. Konsument: karta Jakość danych w Odżywianiu.';

ALTER TABLE public.food_integrity_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own food integrity findings" ON public.food_integrity_findings
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users update own food integrity findings" ON public.food_integrity_findings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.food_integrity_findings FROM anon, authenticated;
GRANT SELECT ON public.food_integrity_findings TO authenticated;
GRANT UPDATE (status, resolved_at) ON public.food_integrity_findings TO authenticated;

CREATE TABLE IF NOT EXISTS public.food_integrity_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ran_at timestamptz NOT NULL DEFAULT now(),
  window_days integer NOT NULL,
  summary jsonb NOT NULL,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS food_integrity_runs_user_ran_idx
  ON public.food_integrity_runs (user_id, ran_at DESC);

COMMENT ON TABLE public.food_integrity_runs IS
  'Historia przebiegów audytu jedzenia: pewność każdego składnika (błonnik, cukier, nasycone, sól) i udział szacunków.';

ALTER TABLE public.food_integrity_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own food integrity runs" ON public.food_integrity_runs
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.food_integrity_runs FROM anon, authenticated;
GRANT SELECT ON public.food_integrity_runs TO authenticated;

-- Kwarantanna ulubionych jak w food_library: rekord zostaje do korekty, ale nie jest dopasowywany ani sugerowany.
ALTER TABLE public.food_favorites
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS validation_reason text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

ALTER TABLE public.food_favorites DROP CONSTRAINT IF EXISTS food_favorites_validation_status_check;
ALTER TABLE public.food_favorites
  ADD CONSTRAINT food_favorites_validation_status_check
  CHECK (validation_status IN ('unreviewed', 'verified', 'quarantined'));

CREATE INDEX IF NOT EXISTS food_favorites_active_name_idx
  ON public.food_favorites (user_id, lower(name))
  WHERE validation_status <> 'quarantined';

-- Co poniedziałek 04:30 UTC (5:30/6:30 Warszawa) audyt ostatnich 7 dni, całej biblioteki i zdjęć.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'food-integrity-audit') THEN
    PERFORM cron.schedule(
      'food-integrity-audit',
      '30 4 * * 1',
      $cmd$
        SELECT net.http_post(
          url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/food-integrity-audit',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vanguard_cron_service_role_key' LIMIT 1)
          ),
          body := '{}'::jsonb
        );
      $cmd$
    );
  END IF;
END;
$$;
