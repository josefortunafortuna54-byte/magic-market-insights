-- ============================================================================
-- Comprovativos de pagamento + saques + suporte ao painel admin
-- Tabelas: payment_receipts, withdrawal_requests, push_tokens,
--          message_reports, admin_notifications
-- Bucket:  payment-proofs (público para leitura)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. payment_receipts (comprovativos enviados pelos utilizadores)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text,
  plan text,
  method text,
  amount numeric(14,2) default 0,
  currency text default 'usd',
  proof_url text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payment_receipts_user_idx on public.payment_receipts (user_id, created_at desc);
create index if not exists payment_receipts_status_idx on public.payment_receipts (status);

alter table public.payment_receipts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users insert own receipts' and tablename = 'payment_receipts') then
    create policy "Users insert own receipts" on public.payment_receipts
      for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users select own receipts' and tablename = 'payment_receipts') then
    create policy "Users select own receipts" on public.payment_receipts
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. withdrawal_requests (pedidos de saque)
-- ---------------------------------------------------------------------------
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  method text,
  amount numeric(14,2) default 0,
  currency text default 'usd',
  details text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  notes text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists withdrawal_requests_user_idx on public.withdrawal_requests (user_id, created_at desc);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests (status);

alter table public.withdrawal_requests enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users insert own withdrawals' and tablename = 'withdrawal_requests') then
    create policy "Users insert own withdrawals" on public.withdrawal_requests
      for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users select own withdrawals' and tablename = 'withdrawal_requests') then
    create policy "Users select own withdrawals" on public.withdrawal_requests
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. push_tokens (tokens Expo para push notifications)
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users manage own push tokens' and tablename = 'push_tokens') then
    create policy "Users manage own push tokens" on public.push_tokens
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. message_reports (denúncias de mensagens da comunidade)
-- ---------------------------------------------------------------------------
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','acted')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists message_reports_status_idx on public.message_reports (status, created_at desc);

alter table public.message_reports enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated insert reports' and tablename = 'message_reports') then
    create policy "Authenticated insert reports" on public.message_reports
      for insert to authenticated with check (reporter_id = auth.uid());
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users select own reports' and tablename = 'message_reports') then
    create policy "Users select own reports" on public.message_reports
      for select to authenticated using (reporter_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. admin_notifications (sino do admin; escrita via service_role/triggers)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'system_error',
  title text not null,
  message text not null default '',
  entity_type text,
  entity_id uuid,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists admin_notifications_created_idx on public.admin_notifications (created_at desc);

alter table public.admin_notifications enable row level security;
-- Sem policies: apenas service_role (edge function admin-manage) acede.

-- ---------------------------------------------------------------------------
-- 6. subscriptions: colunas plan/currency
-- ---------------------------------------------------------------------------
alter table public.subscriptions add column if not exists plan text;
alter table public.subscriptions add column if not exists currency text;
create unique index if not exists subscriptions_user_id_key on public.subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- 7. Triggers → admin_notifications (security definer contorna RLS)
-- ---------------------------------------------------------------------------
create or replace function public.fn_notify_admin(
  p_type text, p_title text, p_message text, p_entity_type text default null, p_entity_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_notifications (type, title, message, entity_type, entity_id)
  values (p_type, p_title, p_message, p_entity_type, p_entity_id);
end $$;

create or replace function public.fn_trg_receipt_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_notify_admin(
    'receipt_pending', 'Novo comprovativo',
    coalesce(new.user_email, 'Utilizador') || ' | ' || coalesce(new.plan, '?')
      || ' | ' || coalesce(new.amount::text, '') || ' ' || coalesce(new.currency, ''),
    'receipt', new.id
  );
  return new;
end $$;

drop trigger if exists trg_admin_receipt_notify on public.payment_receipts;
create trigger trg_admin_receipt_notify after insert on public.payment_receipts
for each row execute function public.fn_trg_receipt_notify();

create or replace function public.fn_trg_withdrawal_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_notify_admin(
    'withdrawal_pending', 'Nova solicitacao de saque',
    coalesce(new.method, '?') || ' | ' || coalesce(new.amount::text, '')
      || ' ' || coalesce(new.currency, ''),
    'withdrawal', new.id
  );
  return new;
end $$;

drop trigger if exists trg_admin_withdrawal_notify on public.withdrawal_requests;
create trigger trg_admin_withdrawal_notify after insert on public.withdrawal_requests
for each row execute function public.fn_trg_withdrawal_notify();

-- ---------------------------------------------------------------------------
-- 8. Storage: bucket payment-proofs (leitura pública, escrita na própria pasta)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Public read payment-proofs' and tablename = 'objects') then
    create policy "Public read payment-proofs" on storage.objects
      for select using (bucket_id = 'payment-proofs');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated upload own payment-proofs' and tablename = 'objects') then
    create policy "Authenticated upload own payment-proofs" on storage.objects
      for insert to authenticated with check (
        bucket_id = 'payment-proofs'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Realtime
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'payment_receipts' and schemaname = 'public') then
    alter publication supabase_realtime add table public.payment_receipts;
  end if;
end $$;
