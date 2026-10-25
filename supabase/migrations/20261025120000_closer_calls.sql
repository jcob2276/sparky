-- Rozmowy sprzedażowe nagrane przez Fathom (Google Meet) + analiza AI (błędy i dobre zagrania)
CREATE TABLE IF NOT EXISTS public.closer_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fathom_recording_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  call_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  share_url TEXT,
  has_external_invitees BOOLEAN NOT NULL DEFAULT false,
  summary_md TEXT,
  transcript JSONB,
  action_items JSONB,
  invitees JSONB,
  ai_status TEXT NOT NULL DEFAULT 'pending',
  ai_outcome TEXT,
  ai_score INTEGER,
  ai_mistakes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_good_moves JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_next_step TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT closer_calls_user_recording_key UNIQUE (user_id, fathom_recording_id),
  CONSTRAINT closer_calls_ai_status_check CHECK (ai_status IN ('pending', 'done', 'failed', 'skipped')),
  CONSTRAINT closer_calls_ai_outcome_check CHECK (ai_outcome IS NULL OR ai_outcome IN ('closed', 'follow_up', 'lost', 'unclear')),
  CONSTRAINT closer_calls_ai_score_check CHECK (ai_score IS NULL OR ai_score BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS closer_calls_user_date_idx ON public.closer_calls (user_id, call_date DESC);

ALTER TABLE public.closer_calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'closer_calls' AND policyname = 'closer_calls_owner'
  ) THEN
    CREATE POLICY "closer_calls_owner" ON public.closer_calls
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

GRANT ALL ON TABLE public.closer_calls TO authenticated, service_role;
