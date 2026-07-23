-- Create missing tables for community and subscription features
-- Safe to re-run (all objects use IF NOT EXISTS / conditional creation)

-- ==========================================
-- 1. POSTS (Admin posts for community)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  pair TEXT DEFAULT '',
  signal_type TEXT DEFAULT 'NEUTRO',
  image_url TEXT DEFAULT '',
  audio_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read posts' AND tablename = 'posts') THEN
    CREATE POLICY "Allow public read posts" ON public.posts FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert posts' AND tablename = 'posts') THEN
    CREATE POLICY "Authenticated insert posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update posts' AND tablename = 'posts') THEN
    CREATE POLICY "Authenticated update posts" ON public.posts FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete posts' AND tablename = 'posts') THEN
    CREATE POLICY "Authenticated delete posts" ON public.posts FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;

-- ==========================================
-- 2. BOOM_HOURS (Boom period definitions)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.boom_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  time_gmt TEXT NOT NULL,
  time_wat TEXT NOT NULL,
  pairs TEXT[] DEFAULT ARRAY[]::TEXT[],
  days TEXT DEFAULT '',
  description TEXT DEFAULT '',
  volatility INTEGER DEFAULT 4,
  badge TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boom_hours ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read boom_hours' AND tablename = 'boom_hours') THEN
    CREATE POLICY "Allow public read boom_hours" ON public.boom_hours FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert boom_hours' AND tablename = 'boom_hours') THEN
    CREATE POLICY "Authenticated insert boom_hours" ON public.boom_hours FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update boom_hours' AND tablename = 'boom_hours') THEN
    CREATE POLICY "Authenticated update boom_hours" ON public.boom_hours FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete boom_hours' AND tablename = 'boom_hours') THEN
    CREATE POLICY "Authenticated delete boom_hours" ON public.boom_hours FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'boom_hours' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boom_hours;
  END IF;
END $$;

-- Add days column if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boom_hours' AND column_name = 'days') THEN
    ALTER TABLE public.boom_hours ADD COLUMN days TEXT DEFAULT '';
  END IF;
END $$;

-- ==========================================
-- 3. BOOM_TIMES (Specific boom time events)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.boom_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL,
  boom_time TIMESTAMP WITH TIME ZONE NOT NULL,
  confidence INTEGER DEFAULT 75,
  result TEXT,
  image_url TEXT DEFAULT '',
  audio_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boom_times ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read boom_times' AND tablename = 'boom_times') THEN
    CREATE POLICY "Allow public read boom_times" ON public.boom_times FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert boom_times' AND tablename = 'boom_times') THEN
    CREATE POLICY "Authenticated insert boom_times" ON public.boom_times FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update boom_times' AND tablename = 'boom_times') THEN
    CREATE POLICY "Authenticated update boom_times" ON public.boom_times FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete boom_times' AND tablename = 'boom_times') THEN
    CREATE POLICY "Authenticated delete boom_times" ON public.boom_times FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'boom_times' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boom_times;
  END IF;
END $$;

-- ==========================================
-- 4. BOOM_COMMENTS (User comments on boom times)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.boom_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boom_id UUID NOT NULL REFERENCES public.boom_times(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT DEFAULT 'Trader',
  user_avatar TEXT DEFAULT '',
  text TEXT DEFAULT '',
  audio_url TEXT DEFAULT '',
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boom_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read boom_comments' AND tablename = 'boom_comments') THEN
    CREATE POLICY "Allow public read boom_comments" ON public.boom_comments FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert boom_comments' AND tablename = 'boom_comments') THEN
    CREATE POLICY "Authenticated insert boom_comments" ON public.boom_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete boom_comments' AND tablename = 'boom_comments') THEN
    CREATE POLICY "Authenticated delete boom_comments" ON public.boom_comments FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'boom_comments' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boom_comments;
  END IF;
END $$;

-- ==========================================
-- 5. BOOM_VOTES (User votes on boom times)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.boom_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boom_id UUID NOT NULL REFERENCES public.boom_times(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('BUY', 'SELL')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(boom_id, user_id)
);

ALTER TABLE public.boom_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read boom_votes' AND tablename = 'boom_votes') THEN
    CREATE POLICY "Allow public read boom_votes" ON public.boom_votes FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert boom_votes' AND tablename = 'boom_votes') THEN
    CREATE POLICY "Authenticated insert boom_votes" ON public.boom_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete boom_votes' AND tablename = 'boom_votes') THEN
    CREATE POLICY "Authenticated delete boom_votes" ON public.boom_votes FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'boom_votes' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boom_votes;
  END IF;
END $$;

-- ==========================================
-- 6. SUBSCRIPTIONS (Stripe subscriptions)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'inactive',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Allow public read subscriptions" ON public.subscriptions FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Authenticated insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Authenticated update subscriptions" ON public.subscriptions FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Authenticated delete subscriptions" ON public.subscriptions FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;
END $$;

-- ==========================================
-- 7. Storage buckets
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('comments-audio', 'comments-audio', true)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read posts bucket' AND tablename = 'objects') THEN
    CREATE POLICY "Allow public read posts bucket" ON storage.objects
      FOR SELECT USING (bucket_id = 'posts');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated upload posts bucket' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated upload posts bucket" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'posts' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete posts bucket' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated delete posts bucket" ON storage.objects
      FOR DELETE USING (bucket_id = 'posts' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read comments-audio bucket' AND tablename = 'objects') THEN
    CREATE POLICY "Allow public read comments-audio bucket" ON storage.objects
      FOR SELECT USING (bucket_id = 'comments-audio');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated upload comments-audio bucket' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated upload comments-audio bucket" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'comments-audio' AND auth.role() = 'authenticated');
  END IF;
END $$;
