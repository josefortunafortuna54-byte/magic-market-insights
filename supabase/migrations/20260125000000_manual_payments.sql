-- ============================================================
-- Manual payments: Binance + Multicaixa Express (with proof)
-- Stripe remains as the parallel automatic option.
--
-- Flow:
--   user -> upload proof to storage + insert payment_requests (pending)
--   admin -> review_payment_request() approves/rejects
--   approved -> subscriptions upserted (active, +30 days)
--
-- Safe to re-run (IF NOT EXISTS everywhere).
-- ============================================================

-- ==========================================
-- 1. PAYMENT_REQUESTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('binance', 'multicaixa')),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'aoa')),
  amount DECIMAL NOT NULL,
  transaction_id TEXT NOT NULL,
  proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_email TEXT
);

CREATE INDEX IF NOT EXISTS payment_requests_user_id_idx ON public.payment_requests (user_id);
CREATE INDEX IF NOT EXISTS payment_requests_status_idx ON public.payment_requests (status);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Users read only their own payment requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own payment requests' AND tablename = 'payment_requests') THEN
    CREATE POLICY "Users read own payment requests" ON public.payment_requests
      FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Users create only their own payment requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own payment requests' AND tablename = 'payment_requests') THEN
    CREATE POLICY "Users insert own payment requests" ON public.payment_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Only service_role can mutate (status changes go through review RPC)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access payment_requests' AND tablename = 'payment_requests') THEN
    CREATE POLICY "Service role full access payment_requests" ON public.payment_requests
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 2. STORAGE 'payment-proofs'
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
  ON CONFLICT (id) DO NOTHING;

-- Public read (URLs are UUID-based and unguessable; the owner reads via the
-- payment_requests table which is RLS-scoped to the owner).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read payment proofs' AND tablename = 'objects') THEN
    CREATE POLICY "Allow public read payment proofs" ON storage.objects
      FOR SELECT USING (bucket_id = 'payment-proofs');
  END IF;
END $$;

-- Authenticated users upload only inside their own folder: {user_id}/...
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated upload own payment proofs' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated upload own payment proofs" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'payment-proofs'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Users delete only their own proofs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own payment proofs' AND tablename = 'objects') THEN
    CREATE POLICY "Users delete own payment proofs" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'payment-proofs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- ==========================================
-- 3. ADMIN RPCs
-- ==========================================

-- Admin-only: all payment requests with the user email
CREATE OR REPLACE FUNCTION public.get_all_payment_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT pr.*, u.email
      FROM public.payment_requests pr
      LEFT JOIN auth.users u ON u.id = pr.user_id
      ORDER BY pr.created_at DESC
    ) r
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_payment_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_payment_requests() TO authenticated;

-- Admin-only: approve/reject a payment request.
-- 'approved' also activates the user subscription (+30 days).
CREATE OR REPLACE FUNCTION public.review_payment_request(payment_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.payment_requests%ROWTYPE;
  reviewer_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO req FROM public.payment_requests WHERE id = payment_id;
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Pagamento já processado';
  END IF;

  reviewer_email := auth.jwt() ->> 'email';

  IF new_status = 'approved' THEN
    INSERT INTO public.subscriptions (
      user_id, status, currency, stripe_customer_id, current_period_end, updated_at
    ) VALUES (
      req.user_id, 'active', req.currency,
      'manual-' || req.method || '-' || req.id::text,
      now() + interval '30 days', now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'active',
      currency = EXCLUDED.currency,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = now();
  END IF;

  UPDATE public.payment_requests
  SET status = new_status,
      reviewed_at = now(),
      reviewed_by_email = reviewer_email,
      updated_at = now()
  WHERE id = payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid, text) TO authenticated;
