-- Signal outcomes tracking for backtesting and feedback loop
-- Tracks detailed performance data for each closed signal

-- 1. Signal outcomes table
create table if not exists public.signal_outcomes (
  id              uuid primary key default gen_random_uuid(),
  signal_id       uuid not null references public.signals(id) on delete cascade,
  symbol          text not null,
  timeframe       text not null,
  signal_type     text not null,
  smc_setup       text,
  session_name    text,
  entry_price     numeric not null,
  exit_price      numeric not null,
  stop_loss       numeric not null,
  target_price    numeric not null,
  result          text not null check (result in ('tp', 'sl', 'expired', 'manual')),
  pips_result     numeric not null default 0,
  risk_reward     numeric not null default 0,
  confidence      numeric not null default 75,
  tech_score      numeric default 0,
  created_at      timestamptz not null default now(),
  closed_at       timestamptz not null default now(),
  holding_time    interval generated always as (closed_at - created_at) stored
);

comment on table public.signal_outcomes is 'Detailed performance tracking for closed signals';
comment on column public.signal_outcomes.tech_score is 'Rule-based technical confirmation score (0-100)';
comment on column public.signal_outcomes.session_name is 'Trading session when signal was generated';
comment on column public.signal_outcomes.holding_time is 'Auto-computed time between creation and closure';

-- 2. Indexes for analytics queries
create index if not exists idx_outcomes_symbol on public.signal_outcomes (symbol);
create index if not exists idx_outcomes_timeframe on public.signal_outcomes (timeframe);
create index if not exists idx_outcomes_result on public.signal_outcomes (result);
create index if not exists idx_outcomes_created on public.signal_outcomes (created_at desc);
create index if not exists idx_outcomes_symbol_result on public.signal_outcomes (symbol, result);
create index if not exists idx_outcomes_smc_setup on public.signal_outcomes (smc_setup);

-- 3. RLS: only service_role can write, authenticated can read
alter table public.signal_outcomes enable row level security;

drop policy if exists outcomes_select_auth on public.signal_outcomes;
create policy outcomes_select_auth on public.signal_outcomes
  for select to authenticated using (true);

drop policy if exists outcomes_insert_service on public.signal_outcomes;
create policy outcomes_insert_service on public.signal_outcomes
  for insert to service_role with check (true);

drop policy if exists outcomes_update_service on public.signal_outcomes;
create policy outcomes_update_service on public.signal_outcomes
  for update to service_role using (true) with check (true);

-- 4. Realtime
do $$
begin
  alter publication supabase_realtime add table public.signal_outcomes;
exception when duplicate_object then null;
end $$;

-- 5. Analytics RPC functions

-- Win rate by pair
create or replace function public.get_pair_analytics(uid uuid default auth.uid())
returns table (
  symbol text,
  total bigint,
  wins bigint,
  losses bigint,
  win_rate numeric,
  avg_pips numeric,
  total_pips numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.symbol,
    count(*) as total,
    count(*) filter (where o.result = 'tp') as wins,
    count(*) filter (where o.result = 'sl') as losses,
    round(count(*) filter (where o.result = 'tp')::numeric / greatest(count(*), 1) * 100, 1) as win_rate,
    round(avg(o.pips_result), 1) as avg_pips,
    round(sum(o.pips_result), 1) as total_pips
  from public.signal_outcomes o
  where public.user_can_access_pair(o.symbol, uid)
  group by o.symbol
  order by total_pips desc;
$$;

grant execute on function public.get_pair_analytics(uuid) to authenticated;

-- Win rate by timeframe
create or replace function public.get_timeframe_analytics(uid uuid default auth.uid())
returns table (
  timeframe text,
  total bigint,
  wins bigint,
  win_rate numeric,
  avg_pips numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.timeframe,
    count(*) as total,
    count(*) filter (where o.result = 'tp') as wins,
    round(count(*) filter (where o.result = 'tp')::numeric / greatest(count(*), 1) * 100, 1) as win_rate,
    round(avg(o.pips_result), 1) as avg_pips
  from public.signal_outcomes o
  group by o.timeframe
  order by total desc;
$$;

grant execute on function public.get_timeframe_analytics(uuid) to authenticated;

-- Win rate by SMC setup
create or replace function public.get_smc_setup_analytics()
returns table (
  smc_setup text,
  total bigint,
  wins bigint,
  win_rate numeric,
  avg_pips numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(o.smc_setup, 'UNKNOWN') as smc_setup,
    count(*) as total,
    count(*) filter (where o.result = 'tp') as wins,
    round(count(*) filter (where o.result = 'tp')::numeric / greatest(count(*), 1) * 100, 1) as win_rate,
    round(avg(o.pips_result), 1) as avg_pips
  from public.signal_outcomes o
  group by o.smc_setup
  order by total desc;
$$;

grant execute on function public.get_smc_setup_analytics() to authenticated;

-- Equity curve (cumulative pips over time)
create or replace function public.get_equity_curve(
  days int default 30,
  uid uuid default auth.uid()
)
returns table (
  date date,
  daily_pips numeric,
  cumulative_pips numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with daily as (
    select
      date_trunc('day', o.closed_at)::date as d,
      sum(o.pips_result) as daily_pips
    from public.signal_outcomes o
    where o.closed_at >= now() - (days || ' days')::interval
      and public.user_can_access_pair(o.symbol, uid)
    group by 1
  )
  select
    d,
    daily_pips,
    sum(daily_pips) over (order by d) as cumulative_pips
  from daily
  order by d;
$$;

grant execute on function public.get_equity_curve(int, uuid) to authenticated;
