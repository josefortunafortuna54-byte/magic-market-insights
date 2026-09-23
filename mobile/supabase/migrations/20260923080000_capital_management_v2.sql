-- ============================================================================
-- CAPITAL MANAGEMENT V2
-- 1) meta_percent: meta publicada pela equipa (default 25) na conta de capital
-- 2) realtime: publica payment_receipts e withdrawal_requests (faltavam)
-- 3) mutation_credit_capital_account: crédito ADITIVO e atómico (chamado pelo
--    edge admin-manage; contorna a ausencia de select-for-update no edge role)
-- 4) paid_at: registo do pagamento no mark_withdrawal_paid
-- ============================================================================

-- meta_percent: meta publicada pela equipa (2019 default mantém 25%)
alter table public.capital_accounts
  add column if not exists meta_percent numeric(8, 2) not null default 25;

-- Realtime mínimo: publica as tabelas que faltam e ignora se já publica.
do $$
begin
  alter publication supabase_realtime add table public.payment_receipts;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.withdrawal_requests;
exception
  when duplicate_object then null;
end $$;

-- paid_at no mark_withdrawal_paid (transição approved → paid)
alter table public.withdrawal_requests
  add column if not exists paid_at timestamptz;

-- Crédito aditivo/atómico de capital. Idempotente por moeda: soma se a conta
-- existir, cria com capital = achieved = amount caso contrário.
create or replace function public.mutation_credit_capital_account(
  p_user_id uuid,
  p_amount numeric,
  p_currency text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_currency text := lower(p_currency);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor de crédito inválido';
  end if;
  if v_currency not in ('usd', 'aoa') then
    raise exception 'Moeda inválida';
  end if;

  if exists (
    select 1 from public.capital_accounts
    where user_id = p_user_id and currency = v_currency
  ) then
    update public.capital_accounts
    set capital = capital + p_amount,
        achieved = achieved + p_amount,
        updated_at = now()
    where user_id = p_user_id and currency = v_currency;
  else
    insert into public.capital_accounts
      (user_id, plan, capital, achieved, currency, total_withdrawn, status, created_at, updated_at)
    values
      (p_user_id, 'capital', p_amount, p_amount, v_currency, 0, 'active', now(), null);
  end if;
end;
$$;