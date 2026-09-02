-- ============================================================================
-- PAYMENT RECEIPTS TABLE
-- Armazena comprovativos de pagamento enviados pelos utilizadores.
-- Os admins podem listar, aprovar ou rejeitar comprovativos.
-- ============================================================================

create table if not exists public.payment_receipts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_email  text,
  proof_url   text not null,
  plan        text not null,
  method      text not null,
  amount      numeric not null default 0,
  currency    text not null default 'usd',
  status      text not null default 'pending',  -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);

-- RLS: only service_role can write, authenticated can read own
alter table public.payment_receipts enable row level security;

do $$ begin
  drop policy if exists "receipts_select_own" on public.payment_receipts;
  create policy "receipts_select_own" on public.payment_receipts
    for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "receipts_insert_service" on public.payment_receipts;
  create policy "receipts_insert_service" on public.payment_receipts
    for insert to service_role
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "receipts_update_service" on public.payment_receipts;
  create policy "receipts_update_service" on public.payment_receipts
    for update to service_role
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "receipts_delete_service" on public.payment_receipts;
  create policy "receipts_delete_service" on public.payment_receipts
    for delete to service_role
    using (true);
exception when duplicate_object then null;
end $$;

-- Index for admin queries
create index if not exists idx_receipts_status on public.payment_receipts (status);
create index if not exists idx_receipts_user on public.payment_receipts (user_id);
create index if not exists idx_receipts_created on public.payment_receipts (created_at desc);
