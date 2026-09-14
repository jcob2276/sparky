-- Create closer daily tracking table
CREATE TABLE IF NOT EXISTS public.closer_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  dials INTEGER NOT NULL DEFAULT 0,
  work_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,
  appointments INTEGER NOT NULL DEFAULT 0,
  sales_calls INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT closer_daily_logs_user_date_key UNIQUE (user_id, date)
);

ALTER TABLE public.closer_daily_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'closer_daily_logs' AND policyname = 'closer_daily_logs_owner'
  ) THEN
    CREATE POLICY "closer_daily_logs_owner" ON public.closer_daily_logs
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

GRANT ALL ON TABLE public.closer_daily_logs TO authenticated, service_role;
