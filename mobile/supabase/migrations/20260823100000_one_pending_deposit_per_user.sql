-- ============================================================================
-- ONE PENDING DEPOSIT PER USER
-- Regra de negócio: o utilizador só pode ter UM pedido de depósito pendente.
-- O índice único parcial rejeita um segundo recibo 'pending' do mesmo user,
-- mesmo em corrida (race condition), ao nível da base de dados.
-- ============================================================================

create unique index if not exists uq_payment_receipts_one_pending_per_user
  on public.payment_receipts (user_id)
  where status = 'pending';
