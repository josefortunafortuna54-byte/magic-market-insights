-- Fix overly permissive RLS policies on whatsapp_subscriptions
-- Safe to re-run (DROP IF EXISTS + conditional CREATE)

-- Drop old permissive policies (ignore if already dropped)
DROP POLICY IF EXISTS "Allow public insert" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Allow public read by phone" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Allow public update" ON public.whatsapp_subscriptions;

-- Authenticated insert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert own subscription' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Authenticated insert own subscription" ON public.whatsapp_subscriptions
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Authenticated read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read own subscriptions' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Authenticated read own subscriptions" ON public.whatsapp_subscriptions
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Authenticated update
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update own subscription' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Authenticated update own subscription" ON public.whatsapp_subscriptions
      FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Service role full access" ON public.whatsapp_subscriptions
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
