-- ============================================================================
-- WALLET MOVEMENTS TABLE
-- Migra o sistema de movimentos de AsyncStorage (client-only) para Supabase.
-- Cada depósito/levantamento fica registado server-side com sync local-first.
-- ============================================================================

create table if not exists public.wallet_movements (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('deposit', 'withdrawal')),
  method      text not null,  -- binance | rodotpay | express
  amount      numeric not null,
  currency    text not null default 'usd',  -- usd | aoa
  plan        text,                         -- basic | pro | premium (deposits only)
  status      text not null default 'pendente',  -- pendente | concluido | recusado
  receipt_id  uuid references public.payment_receipts(id) on delete set null,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table public.wallet_movements enable row level security;

-- Users can read their own movements
do $$ begin
  drop policy if exists "wm_select_own" on public.wallet_movements;
  create policy "wm_select_own" on public.wallet_movements
    for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Users can insert their own movements (deposits + withdrawal requests)
do $$ begin
  drop policy if exists "wm_insert_own" on public.wallet_movements;
  create policy "wm_insert_own" on public.wallet_movements
    for insert to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Service role can update (for admin approval/status changes)
do $$ begin
  drop policy if exists "wm_update_service" on public.wallet_movements;
  create policy "wm_update_service" on public.wallet_movements
    for update to service_role
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

-- Indexes
create index if not exists idx_wm_user on public.wallet_movements (user_id);
create index if not exists idx_wm_status on public.wallet_movements (status);
create index if not exists idx_wm_created on public.wallet_movements (created_at desc);

-- Auto-update updated_at
create or replace function public.update_wm_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_wm_updated on public.wallet_movements;
create trigger trg_wm_updated
  before update on public.wallet_movements
  for each row execute function public.update_wm_timestamp();
