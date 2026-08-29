-- Add INSERT/UPDATE/DELETE policies for signals table (admin use)
-- Safe to re-run (checks if policy exists before creating)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert signals' AND tablename = 'signals') THEN
    CREATE POLICY "Authenticated insert signals" ON public.signals
      FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update signals' AND tablename = 'signals') THEN
    CREATE POLICY "Authenticated update signals" ON public.signals
      FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete signals' AND tablename = 'signals') THEN
    CREATE POLICY "Authenticated delete signals" ON public.signals
      FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
