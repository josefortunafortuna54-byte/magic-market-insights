-- ============================================================================
-- TRADE JOURNAL TABLE
-- Backup server-side do diário de trades do utilizador.
-- Sync bidireccional: AsyncStorage (local) + Supabase (server).
-- ============================================================================

create table if not exists public.trade_journal (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  pair          text not null,
  direction     text not null,          -- BUY | SELL
  entry_price   numeric not null,
  exit_price    numeric,
  lot_size      numeric not null default 0.1,
  result        text not null default 'BREAKEVEN',  -- WIN | LOSS | BREAKEVEN
  profit_usd    numeric not null default 0,
  pips          numeric not null default 0,
  notes         text not null default '',
  boom_hour_id  text,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz,
  synced_at     timestamptz default now()
);

-- RLS
alter table public.trade_journal enable row level security;

do $$ begin
  drop policy if exists "trade_journal_select_own" on public.trade_journal;
  create policy "trade_journal_select_own" on public.trade_journal
    for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "trade_journal_insert_own" on public.trade_journal;
  create policy "trade_journal_insert_own" on public.trade_journal
    for insert to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "trade_journal_update_own" on public.trade_journal;
  create policy "trade_journal_update_own" on public.trade_journal
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "trade_journal_delete_own" on public.trade_journal;
  create policy "trade_journal_delete_own" on public.trade_journal
    for delete to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Indexes
create index if not exists idx_trade_journal_user on public.trade_journal (user_id);
create index if not exists idx_trade_journal_created on public.trade_journal (created_at desc);
create index if not exists idx_trade_journal_pair on public.trade_journal (pair);
