-- Allow HOLD signals in market_analysis
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'market_analysis_signal_type_check'
      AND n.nspname = 'public'
      AND t.relname = 'market_analysis'
  ) THEN
    ALTER TABLE public.market_analysis
      DROP CONSTRAINT market_analysis_signal_type_check;
  END IF;
END $$;

ALTER TABLE public.market_analysis
  ADD CONSTRAINT market_analysis_signal_type_check
  CHECK (signal_type IN ('BUY','SELL','HOLD'));
