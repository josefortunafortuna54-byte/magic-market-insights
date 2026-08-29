-- Dashboard: announcements table (admin-managed banner cards)
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS)

-- ==========================================
-- 1. ANNOUNCEMENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  link TEXT,
  link_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_active_idx
  ON public.announcements (sort_order, created_at DESC)
  WHERE is_active = true;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users only see active announcements inside their window.
-- Writes: no client policies — managed exclusively via service_role (admin).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read active announcements' AND tablename = 'announcements') THEN
    CREATE POLICY "Authenticated read active announcements" ON public.announcements
      FOR SELECT TO authenticated
      USING (
        is_active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at >= now())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;

-- ==========================================
-- 2. Seed de exemplo (removível)
-- ==========================================
INSERT INTO public.announcements (title, body, link, link_label, sort_order)
SELECT 'Bem-vindo à TMT', 'Siga os nossos sinais e booms diários. Boa sorte, trader!', '/planos', 'Ver planos', 0
WHERE NOT EXISTS (SELECT 1 FROM public.announcements);
