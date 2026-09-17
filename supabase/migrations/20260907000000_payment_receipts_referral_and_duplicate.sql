-- ============================================================================
-- FIX WEB: garante payment_receipts.referral_code e duplicate_of na base.
-- O cliente web insere referral_code em saveReceipt e o admin lê duplicate_of.
-- Na base partilhada estas colunas já existem (migrações de mobile/supabase),
-- mas esta migração é idempotente e cobre ambientes criados apenas a partir
-- de supabase/migrations deste repo (local, staging, reconstruções), onde a
-- sua ausência faz o INSERT falhar após o upload do comprovativo.
-- Versão própria (20260907...) para não colidir com a do mobile 20260823... .
-- ============================================================================

alter table public.payment_receipts
  add column if not exists referral_code text;

alter table public.payment_receipts
  add column if not exists duplicate_of uuid references public.payment_receipts(id);