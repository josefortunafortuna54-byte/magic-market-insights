-- ============================================================================
-- BACKFILL — histórico de transações preso em "pendente"
--
-- O estado mostrado ao utilizador vem de wallet_movements. O trigger de
-- 20261016000000 sincroniza essa cópia quando o comprovativo/pedido muda de
-- estado, mas bases onde o trigger não chegou a correr (ou linhas antigas
-- criadas antes da ligação receipt_id/request_id) ficaram com o histórico
-- desatualizado mesmo depois de o admin aprovar.
--
-- Esta migração corrige as linhas já existentes. É idempotente.
-- ============================================================================

-- Depósitos ligados explicitamente ao comprovativo.
update public.wallet_movements wm
set
  status = case pr.status
    when 'approved' then 'concluido'
    when 'rejected' then 'recusado'
    else 'pendente'
  end,
  updated_at = now()
from public.payment_receipts pr
where wm.receipt_id = pr.id
  and wm.type = 'deposit'
  and wm.status is distinct from case pr.status
    when 'approved' then 'concluido'
    when 'rejected' then 'recusado'
    else 'pendente'
  end;

-- Levantamentos ligados explicitamente ao pedido.
update public.wallet_movements wm
set
  status = case wr.status
    when 'approved' then 'concluido'
    when 'paid' then 'concluido'
    when 'rejected' then 'recusado'
    else 'pendente'
  end,
  updated_at = now()
from public.withdrawal_requests wr
where wm.request_id = wr.id
  and wm.type = 'withdrawal'
  and wm.status is distinct from case wr.status
    when 'approved' then 'concluido'
    when 'paid' then 'concluido'
    when 'rejected' then 'recusado'
    else 'pendente'
  end;

-- Depósitos antigos sem receipt_id: liga à linha autoritativa mais próxima
-- (mesmo utilizador, valor, moeda e criada com menos de 1 hora de diferença).
with matched as (
  select distinct on (wm.id)
    wm.id as movement_id,
    pr.id as receipt_id,
    pr.status
  from public.wallet_movements wm
  join public.payment_receipts pr
    on pr.user_id = wm.user_id
   and abs(pr.amount - wm.amount) < 0.01
   and lower(pr.currency) = lower(wm.currency)
   and abs(extract(epoch from (pr.created_at - wm.created_at))) <= 3600
  where wm.type = 'deposit'
    and wm.receipt_id is null
    and wm.status = 'pendente'
    and not exists (
      select 1 from public.wallet_movements linked where linked.receipt_id = pr.id
    )
  order by wm.id, abs(extract(epoch from (pr.created_at - wm.created_at)))
)
update public.wallet_movements wm
set
  receipt_id = matched.receipt_id,
  status = case matched.status
    when 'approved' then 'concluido'
    when 'rejected' then 'recusado'
    else 'pendente'
  end,
  updated_at = now()
from matched
where wm.id = matched.movement_id;

-- Levantamentos antigos sem request_id: mesma estratégia.
with matched as (
  select distinct on (wm.id)
    wm.id as movement_id,
    wr.id as request_id,
    wr.status
  from public.wallet_movements wm
  join public.withdrawal_requests wr
    on wr.user_id = wm.user_id
   and abs(wr.amount - wm.amount) < 0.01
   and lower(wr.currency) = lower(wm.currency)
   and abs(extract(epoch from (wr.created_at - wm.created_at))) <= 3600
  where wm.type = 'withdrawal'
    and wm.request_id is null
    and wm.status = 'pendente'
    and not exists (
      select 1 from public.wallet_movements linked where linked.request_id = wr.id
    )
  order by wm.id, abs(extract(epoch from (wr.created_at - wm.created_at)))
)
update public.wallet_movements wm
set
  request_id = matched.request_id,
  status = case matched.status
    when 'approved' then 'concluido'
    when 'paid' then 'concluido'
    when 'rejected' then 'recusado'
    else 'pendente'
  end,
  updated_at = now()
from matched
where wm.id = matched.movement_id;
