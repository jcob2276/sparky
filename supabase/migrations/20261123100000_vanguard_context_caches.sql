-- Migration: vanguard_context_caches
-- Purpose: Gemini Context Caching metadata table for Vanguard Digital Twin (Faza 2)

CREATE TABLE IF NOT EXISTS public.vanguard_context_caches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'failed')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast active cache lookup by Oracle
CREATE INDEX IF NOT EXISTS idx_vanguard_context_caches_active 
    ON public.vanguard_context_caches (user_id, status, expires_at DESC)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_vanguard_context_caches_created_at 
    ON public.vanguard_context_caches (created_at DESC);

-- Enable RLS
ALTER TABLE public.vanguard_context_caches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vanguard_context_caches' AND policyname = 'Allow service_role full access to vanguard_context_caches'
  ) THEN
    CREATE POLICY "Allow service_role full access to vanguard_context_caches"
        ON public.vanguard_context_caches
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vanguard_context_caches' AND policyname = 'Allow sparky_worker access to vanguard_context_caches'
  ) THEN
    CREATE POLICY "Allow sparky_worker access to vanguard_context_caches"
        ON public.vanguard_context_caches
        FOR ALL
        TO sparky_worker
        USING (true)
        WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vanguard_context_caches' AND policyname = 'Allow authenticated read own context caches'
  ) THEN
    CREATE POLICY "Allow authenticated read own context caches"
        ON public.vanguard_context_caches
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT ALL ON TABLE public.vanguard_context_caches TO service_role;
GRANT ALL ON TABLE public.vanguard_context_caches TO sparky_worker;
GRANT SELECT ON TABLE public.vanguard_context_caches TO authenticated;
