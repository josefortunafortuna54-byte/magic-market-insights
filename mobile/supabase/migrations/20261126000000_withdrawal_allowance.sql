-- ============================================================================
-- LEVANTAMENTO COM VALOR ESPECÍFICO DISPONIBILIZADO PELO ADMIN
-- 1) capital_accounts.withdrawable_amount: valor reservado pelo admin para
--    levantamento. O saldo (achieved) continua a ser o valor gerido da banca.
-- 2) release_withdrawal_funds: crédito atómico do saldo e do valor levantável.
-- 3) O trigger de withdrawal_requests passa a validar contra o valor
--    levantável (limitado pelo saldo), e não contra o saldo inteiro.
-- ============================================================================

alter table public.capital_accounts
  add column if not exists withdrawable_amount numeric(14,2) not null default 0;

-- ── 1) Crédito atómico feito pelo admin (edge function admin-manage) ────────
create or replace function public.release_withdrawal_funds(
  p_user_id uuid,
  p_amount numeric,
  p_currency text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text := lower(p_currency);
begin
  if p_user_id is null then
    raise exception 'Utilizador inválido';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor inválido';
  end if;
  if v_currency not in ('usd','aoa') then
    raise exception 'Moeda inválida';
  end if;

  insert into public.capital_accounts
    (user_id, plan, currency, capital, achieved, withdrawable_amount, total_withdrawn, status, created_at, updated_at)
  values
    (p_user_id, 'capital', v_currency, 0, p_amount, p_amount, 0, 'active', now(), now())
  on conflict (user_id) do update
    set achieved            = public.capital_accounts.achieved + p_amount,
        withdrawable_amount = public.capital_accounts.withdrawable_amount + p_amount,
        currency            = excluded.currency,
        updated_at          = now();
end;
$$;

revoke all on function public.release_withdrawal_funds(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.release_withdrawal_funds(uuid, numeric, text) to service_role;

alter table public.withdrawal_requests
  add column if not exists debited_at timestamptz;

create or replace function public.approve_withdrawal_request(
  p_id uuid,
  p_admin uuid
)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.withdrawal_requests;
  v_account public.capital_accounts;
begin
  select * into v_req
  from public.withdrawal_requests
  where id = p_id and status = 'pending'
  for update;
  if not found then
    raise exception 'Pedido não está pendente';
  end if;

  select * into v_account
  from public.capital_accounts
  where user_id = v_req.user_id and currency = v_req.currency
  for update;
  if not found then
    raise exception 'Conta de capital não encontrada';
  end if;
  if least(v_account.withdrawable_amount, v_account.achieved) < v_req.amount then
    raise exception 'Saldo indisponível para levantamento';
  end if;

  update public.capital_accounts
     set achieved            = achieved - v_req.amount,
         withdrawable_amount = withdrawable_amount - v_req.amount,
         total_withdrawn     = total_withdrawn + v_req.amount,
         updated_at          = now()
   where id = v_account.id;

  update public.withdrawal_requests
     set status = 'approved',
         reviewed_by = p_admin,
         reviewed_at = now(),
         debited_at = now()
   where id = p_id
  returning * into v_req;

  return v_req;
end;
$$;

revoke all on function public.approve_withdrawal_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_withdrawal_request(uuid, uuid) to service_role;

create or replace function public.withdrawal_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.capital_contracts;
  v_balance  numeric;
  v_allowance numeric;
  v_pending  numeric;
begin
  if new.user_id is null then
    raise exception 'Utilizador inválido';
  end if;

  new.currency := lower(coalesce(new.currency, 'usd'));
  if new.currency not in ('usd', 'aoa') then
    raise exception 'Moeda inválida';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Valor inválido';
  end if;

  select achieved, coalesce(withdrawable_amount, 0) into v_balance, v_allowance
  from public.capital_accounts
  where user_id = new.user_id and currency = new.currency;
  v_balance := coalesce(v_balance, 0);
  v_allowance := coalesce(v_allowance, 0);

  select coalesce(sum(amount), 0) into v_pending
  from public.withdrawal_requests
  where user_id = new.user_id
    and currency = new.currency
    and (status = 'pending' or (status = 'approved' and debited_at is null));

  if new.amount > (least(v_allowance, v_balance) - v_pending) then
    raise exception 'Valor acima do disponível para levantamento';
  end if;

  -- O cliente não controla o estado nem a penalidade.
  new.status         := 'pending';
  new.penalty_pct    := 0;
  new.penalty_amount := 0;

  select * into v_contract
  from public.capital_contracts
  where user_id = new.user_id and status = 'active'
  order by created_at desc
  limit 1;

  -- Penalidade só se levantar antes do fim do prazo (limite máximo).
  if v_contract.id is not null and current_date < v_contract.end_date then
    new.penalty_pct    := coalesce(v_contract.penalty_pct, 0);
    new.penalty_amount := round(new.amount * new.penalty_pct / 100.0, 2);
  end if;

  new.net_amount := new.amount - new.penalty_amount;
  return new;
end;
$$;

drop trigger if exists trg_wr_before_insert on public.withdrawal_requests;
create trigger trg_wr_before_insert
  before insert on public.withdrawal_requests
  for each row execute function public.withdrawal_requests_before_insert();
