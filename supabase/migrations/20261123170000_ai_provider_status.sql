-- Stan dostawców AI dla zdjęć i opisów tekstem: funkcje brzegowe zapisują ostatni sukces i błąd,
-- a aplikacja pokazuje, czy np. skończył się dzienny limit albo środki, zamiast ogólnego „błąd serwera”.
CREATE TABLE IF NOT EXISTS public.ai_provider_status (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('vision', 'text')),
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error_kind text CHECK (last_error_kind IS NULL OR last_error_kind IN ('quota', 'overload', 'balance', 'other')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE public.ai_provider_status ENABLE ROW LEVEL SECURITY;

-- Właściciel tylko czyta; zapisuje wyłącznie klucz service-role z funkcji brzegowych (omija RLS).
CREATE POLICY "Owner reads own ai provider status"
  ON public.ai_provider_status
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
