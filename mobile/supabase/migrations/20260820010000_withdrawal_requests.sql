-- ============================================================================
-- WITHDRAWAL REQUESTS TABLE
-- Pedidos de levantamento com review por admin.
-- ============================================================================

create table if not exists public.withdrawal_requests (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  method      text not null,   -- binance | rodotpay | express
  amount      numeric not null,
  currency    text not null default 'usd',
  details     text,            -- payment details from user (account number, etc.)
  status      text not null default 'pending',  -- pending | approved | rejected | paid
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes       text,            -- admin notes
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table public.withdrawal_requests enable row level security;

-- Users can read their own withdrawals
do $$ begin
  drop policy if exists "wr_select_own" on public.withdrawal_requests;
  create policy "wr_select_own" on public.withdrawal_requests
    for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Users can insert their own withdrawal requests
do $$ begin
  drop policy if exists "wr_insert_own" on public.withdrawal_requests;
  create policy "wr_insert_own" on public.withdrawal_requests
    for insert to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Service role full access (admin review)
do $$ begin
  drop policy if exists "wr_all_service" on public.withdrawal_requests;
  create policy "wr_all_service" on public.withdrawal_requests
    for all to service_role
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

-- Indexes
create index if not exists idx_wr_user on public.withdrawal_requests (user_id);
create index if not exists idx_wr_status on public.withdrawal_requests (status);
create index if not exists idx_wr_created on public.withdrawal_requests (created_at desc);

-- Auto-update updated_at
create or replace function public.update_wr_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_wr_updated on public.withdrawal_requests;
create trigger trg_wr_updated
  before update on public.withdrawal_requests
  for each row execute function public.update_wr_timestamp();
