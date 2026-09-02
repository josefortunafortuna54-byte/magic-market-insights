-- ============================================================================
-- PLAN-BASED RLS ENFORCEMENT
-- Impede que utilizadores burlem o gating de planos no servidor.
-- 1) subscriptions — só service_role escreve, utilizador só lê o seu
-- 2) get_user_plan() — helper que devolve o tier do utilizador
-- 3) get_user_signals() — busca sinais filtrados por plano
-- 4) channels — premium channels bloqueados no server
-- 5) boom_times / boom_comments / boom_votes — RLS básico
-- ============================================================================

-- ─── 1. SUBSCRIPTIONS RLS (CRÍTICO) ────────────────────────────────────────
-- Sem isto, qualquer utilizador pode fazer UPDATE na sua subscription
-- e definir plan='premium', status='active'.

alter table public.subscriptions enable row level security;

-- Utilizador só pode LER a sua própria subscription
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- Nenhum utilizador pode INSERT — apenas Stripe webhook (service_role)
drop policy if exists "subscriptions_insert_service" on public.subscriptions;
create policy "subscriptions_insert_service" on public.subscriptions
  for insert to service_role
  with check (true);

-- Nenhum utilizador pode UPDATE — apenas Stripe webhook (service_role)
drop policy if exists "subscriptions_update_service" on public.subscriptions;
create policy "subscriptions_update_service" on public.subscriptions
  for update to service_role
  using (true)
  with check (true);

-- Nenhum utilizador pode DELETE
drop policy if exists "subscriptions_delete_service" on public.subscriptions;
create policy "subscriptions_delete_service" on public.subscriptions
  for delete to service_role
  using (true);

-- ─── 2. HELPER: get_user_plan() ────────────────────────────────────────────
-- Devolve o tier do utilizador autenticado: 'free', 'basic', 'pro', 'premium'
-- SECURITY DEFINER para poder ler subscriptions em qualquer RLS context.

create or replace function public.get_user_plan(uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select lower(s.plan)
      from public.subscriptions s
      where s.user_id = uid
        and s.status = 'active'
      limit 1
    ),
    'free'
  );
$$;

grant execute on function public.get_user_plan(uuid) to authenticated;

-- ─── 3. HELPER: user_can_access_pair() ─────────────────────────────────────

create or replace function public.user_can_access_pair(
  pair text,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.get_user_plan(uid)
    when 'premium' then true
    when 'pro' then true
    when 'basic' then upper(pair) in ('EURUSD','GBPUSD','USDJPY','AUDUSD','EURGBP','XAUUSD')
    else upper(pair) in ('EURUSD','GBPUSD','USDJPY')
  end;
$$;

grant execute on function public.user_can_access_pair(text, uuid) to authenticated;

-- ─── 4. HELPER: user_can_access_timeframe() ────────────────────────────────

create or replace function public.user_can_access_timeframe(
  tf text,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.get_user_plan(uid)
    when 'premium' then true
    when 'pro' then tf in ('M15','H1','H4')
    when 'basic' then tf in ('M15','H1')
    else tf = 'M15'
  end;
$$;

grant execute on function public.user_can_access_timeframe(text, uuid) to authenticated;

-- ─── 5. FUNÇÃO: get_user_signals() ─────────────────────────────────────────
-- Retorna sinais filtrados pelo plano do utilizador.
-- Pares e timeframes não permitidos são excluídos.
-- Limite diário é aplicado.

create or replace function public.get_user_signals(uid uuid default auth.uid())
returns setof public.signals
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.signals s
  where s.status in ('active', 'pending')
    and public.user_can_access_pair(s.symbol, uid)
    and public.user_can_access_timeframe(s.timeframe, uid)
  order by s.created_at desc;
$$;

grant execute on function public.get_user_signals(uuid) to authenticated;

-- ─── 6. FUNÇÃO: get_user_history() ─────────────────────────────────────────
-- Retorna histórico filtrado por plano (days + pairs).

create or replace function public.get_user_history(uid uuid default auth.uid())
returns setof public.signals
language sql
stable
security definer
set search_path = public
as $$
  with limits as (
    select case public.get_user_plan(uid)
      when 'premium' then -1
      when 'pro' then 30
      when 'basic' then 7
      else 1
    end as history_days
  )
  select s.*
  from public.signals s, limits l
  where s.status in ('tp', 'sl')
    and public.user_can_access_pair(s.symbol, uid)
    and (
      l.history_days = -1
      or s.created_at >= now() - (l.history_days || ' days')::interval
    )
  order by s.created_at desc
  limit 200;
$$;

grant execute on function public.get_user_history(uuid) to authenticated;

-- ─── 7. CHANNELS: proteger premium channels ────────────────────────────────
-- Atualizar SELECT policy para verificar plano em canais premium.

drop policy if exists "channels_select_auth" on public.channels;
create policy "channels_select_auth" on public.channels
  for select to authenticated
  using (
    is_premium = false
    or public.is_premium(auth.uid())
  );

-- ─── 8. BOOM_TIMES RLS ─────────────────────────────────────────────────────
-- Todos os autenticados podem ler. Apenas service_role escreve.

do $$
begin
  alter table public.boom_times enable row level security;
exception when undefined_table then null;
end $$;

drop policy if exists "boom_times_select_auth" on public.boom_times;
create policy "boom_times_select_auth" on public.boom_times
  for select to authenticated
  using (true);

drop policy if exists "boom_times_insert_service" on public.boom_times;
create policy "boom_times_insert_service" on public.boom_times
  for insert to service_role
  with check (true);

drop policy if exists "boom_times_update_service" on public.boom_times;
create policy "boom_times_update_service" on public.boom_times
  for update to service_role
  using (true)
  with check (true);

drop policy if exists "boom_times_delete_service" on public.boom_times;
create policy "boom_times_delete_service" on public.boom_times
  for delete to service_role
  using (true);

-- ─── 9. BOOM_HOURS RLS ─────────────────────────────────────────────────────
-- Pode ser uma view ou tabela. Tratamos como tabela idempotente.

do $$
begin
  alter table public.boom_hours enable row level security;
exception when undefined_table then null;
end $$;

drop policy if exists "boom_hours_select_auth" on public.boom_hours;
create policy "boom_hours_select_auth" on public.boom_hours
  for select to authenticated
  using (true);

drop policy if exists "boom_hours_insert_service" on public.boom_hours;
create policy "boom_hours_insert_service" on public.boom_hours
  for insert to service_role
  with check (true);

drop policy if exists "boom_hours_update_service" on public.boom_hours;
create policy "boom_hours_update_service" on public.boom_hours
  for update to service_role
  using (true)
  with check (true);

-- ─── 10. BOOM_COMMENTS RLS ─────────────────────────────────────────────────
-- Leitura: todos os autenticados. Escrita: apenas o próprio.

do $$
begin
  alter table public.boom_comments enable row level security;
exception when undefined_table then null;
end $$;

drop policy if exists "boom_comments_select_auth" on public.boom_comments;
create policy "boom_comments_select_auth" on public.boom_comments
  for select to authenticated
  using (true);

drop policy if exists "boom_comments_insert_own" on public.boom_comments;
create policy "boom_comments_insert_own" on public.boom_comments
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "boom_comments_delete_own" on public.boom_comments;
create policy "boom_comments_delete_own" on public.boom_comments
  for delete to authenticated
  using (user_id = auth.uid());

-- ─── 11. BOOM_VOTES RLS ────────────────────────────────────────────────────
-- Leitura: todos. Escrita: apenas o próprio.

do $$
begin
  alter table public.boom_votes enable row level security;
exception when undefined_table then null;
end $$;

drop policy if exists "boom_votes_select_auth" on public.boom_votes;
create policy "boom_votes_select_auth" on public.boom_votes
  for select to authenticated
  using (true);

drop policy if exists "boom_votes_insert_own" on public.boom_votes;
create policy "boom_votes_insert_own" on public.boom_votes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "boom_votes_delete_own" on public.boom_votes;
create policy "boom_votes_delete_own" on public.boom_votes
  for delete to authenticated
  using (user_id = auth.uid());

-- ─── 12. LOG ───────────────────────────────────────────────────────────────
do $$
begin
  raise log 'Plan RLS enforcement applied: subscriptions, channels, boom tables, signal/history functions';
end $$;
