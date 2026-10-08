-- ============================================================================
-- USER CANCELS OWN PENDING REQUESTS (web + mobile)
-- Sem estas políticas, o delete do cliente era bloqueado em silêncio pela RLS:
-- o utilizador "apagava" o movimento local, mas a linha continuava no servidor
-- (`wallet_movements` sem política DELETE para authenticated), o comprovativo
-- continuava pendente em `payment_receipts` e o pedido em `withdrawal_requests`
-- — o admin via pedidos fantasmas como pendentes e `hasPendingDepositRequest`
-- mantinha o bloqueio de novos depósitos.
--
-- 1) wallet_movements.request_id: liga cada levantamento ao `withdrawal_requests`
--    correspondente (o `receipt_id` para depósitos já existe), para o cancelamento
--    poder apagar o pedido de servidor associado com precisão.
-- 2) delete policies: o utilizador apaga apenas as próprias linhas AINDA pendentes
--    (a aprovação/rejeição do admin está protegida).
-- ============================================================================

alter table public.wallet_movements
  add column if not exists request_id uuid references public.withdrawal_requests(id) on delete set null;

create index if not exists idx_wm_request on public.wallet_movements (request_id);

-- Movimentos: só o próprio, só enquanto pendente
do $$ begin
  drop policy if exists "wm_delete_own_pending" on public.wallet_movements;
  create policy "wm_delete_own_pending" on public.wallet_movements
    for delete to authenticated
    using (user_id = auth.uid() and status = 'pendente');
exception when duplicate_object then null;
end $$;

-- Comprovativos: só o próprio, só enquanto pending
do $$ begin
  drop policy if exists "receipts_delete_own_pending" on public.payment_receipts;
  create policy "receipts_delete_own_pending" on public.payment_receipts
    for delete to authenticated
    using (user_id = auth.uid() and status = 'pending');
exception when duplicate_object then null;
end $$;

-- Pedidos de levantamento: só o próprio, só enquanto pending
do $$ begin
  drop policy if exists "wr_delete_own_pending" on public.withdrawal_requests;
  create policy "wr_delete_own_pending" on public.withdrawal_requests
    for delete to authenticated
    using (user_id = auth.uid() and status = 'pending');
exception when duplicate_object then null;
end $$;