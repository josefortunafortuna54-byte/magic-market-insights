-- Initial schema: WhatsApp subscriptions + Signals
-- Safe to re-run (IF NOT EXISTS on all objects)

-- ==========================================
-- 1. WHATSAPP_SUBSCRIPTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pairs TEXT[] DEFAULT ARRAY['EUR/USD'],
  timeframes TEXT[] DEFAULT ARRAY['H1'],
  min_confidence INTEGER DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Allow public insert" ON public.whatsapp_subscriptions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read by phone' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Allow public read by phone" ON public.whatsapp_subscriptions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Allow public update" ON public.whatsapp_subscriptions FOR UPDATE USING (true);
  END IF;
END $$;

-- ==========================================
-- 2. SIGNALS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'AGUARDAR')),
  confidence INTEGER NOT NULL,
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  target_price DECIMAL NOT NULL,
  reasons TEXT[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'tp', 'sl')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read signals' AND tablename = 'signals') THEN
    CREATE POLICY "Allow public read signals" ON public.signals FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'signals' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
  END IF;
END $$;
