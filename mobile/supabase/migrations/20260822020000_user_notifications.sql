-- ============================================================================
-- USER NOTIFICATIONS TABLE
-- Caixa de notificação server-side por utilizador.
-- A edge function admin-manage insere aqui quando aprova/recusa um pedido
-- de plano; a app lista estas entradas no centro de notificações (/notificacoes).
-- ============================================================================

create table if not exists public.user_notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  kind       text not null default 'system',   -- system | plan | receipt_approved | receipt_rejected
  data       jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_notifications enable row level security;

do $$ begin
  drop policy if exists "user_notifs_select_own" on public.user_notifications;
  create policy "user_notifs_select_own" on public.user_notifications
    for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "user_notifs_delete_own" on public.user_notifications;
  create policy "user_notifs_delete_own" on public.user_notifications
    for delete to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "user_notifs_update_own" on public.user_notifications;
  create policy "user_notifs_update_own" on public.user_notifications
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Escrita apenas via service_role (edge functions)
do $$ begin
  drop policy if exists "user_notifs_insert_service" on public.user_notifications;
  create policy "user_notifs_insert_service" on public.user_notifications
    for insert to service_role
    with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists idx_user_notifs_user on public.user_notifications (user_id, created_at desc);

-- Realtime: garante que as tabelas publicam mudanças para a app.
-- subscriptions é lida por useSubscription com postgres_changes — sem esta
-- adição o plano nunca atualiza em tempo real após aprovação.
do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.subscriptions;
exception when duplicate_object then null;
end $$;

