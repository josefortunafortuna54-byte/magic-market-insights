-- Add SMC (Smart Money Concepts) fields to signals table

ALTER TABLE public.signals 
  ADD COLUMN IF NOT EXISTS smc_setup text;

COMMENT ON COLUMN public.signals.smc_setup IS 'SMC setup type: BOS, CHoCH, OB, FVG, LIQUIDEZ';
