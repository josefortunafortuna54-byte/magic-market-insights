-- ============================================================================
-- RECEIPT REFERRAL + CAPITAL CREDIT
-- 1) payment_receipts.referral_code: guarda o código de afiliado do utilizador
--    no momento da submissão (capturado via ?ref= no deep link).
-- 2) receipts_insert_own: permite ao utilizador autenticado submeter os seus
--    próprios comprovativos (o cliente insere diretamente em saveReceipt).
-- ============================================================================

alter table public.payment_receipts
  add column if not exists referral_code text;

do $$ begin
  drop policy if exists "receipts_insert_own" on public.payment_receipts;
  create policy "receipts_insert_own" on public.payment_receipts
    for insert to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;
