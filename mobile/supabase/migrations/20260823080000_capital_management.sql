-- ============================================================================
-- CAPITAL MANAGEMENT (Gestão de Capital)
-- Fonte da verdade no servidor para os saldos geridos pela equipa TMT:
--   capital_accounts : saldo autoritativo por utilizador
--   capital_reports  : relatórios periódicos de performance publicados pela equipa
-- Escrita apenas via service_role (edge function admin-manage).
-- ============================================================================

create table if not exists public.capital_accounts (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  currency        text not null default 'usd' check (currency in ('usd','aoa')),
  capital         numeric(14,2) not null default 0,
  achieved        numeric(14,2) not null default 0,
  total_withdrawn numeric(14,2) not null default 0,
  status          text not null default 'active',
  updated_at      timestamptz not null default now()
);

create table if not exists public.capital_reports (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  period_start     date not null,
  period_end       date not null,
  starting_balance numeric(14,2) not null,
  ending_balance   numeric(14,2) not null,
  profit           numeric(14,2) not null default 0,
  profit_pct       numeric(8,2) not null default 0,
  note             text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_capital_reports_user
  on public.capital_reports (user_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.capital_accounts enable row level security;
alter table public.capital_reports enable row level security;

do $$ begin
  create policy "capital_accounts_select_own" on public.capital_accounts
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "capital_accounts_write_service" on public.capital_accounts
    for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "capital_reports_select_own" on public.capital_reports
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "capital_reports_write_service" on public.capital_reports
    for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ── Realtime ────────────────────────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.capital_accounts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.capital_reports;
exception when duplicate_object then null;
end $$;
