-- Allow upsert for public reference data on insider_trades
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insider_trades' AND policyname = 'insider_trades_upsert_all'
  ) THEN
    CREATE POLICY "insider_trades_upsert_all" ON public.insider_trades
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
