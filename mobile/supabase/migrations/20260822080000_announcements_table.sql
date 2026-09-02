-- ============================================================================
-- ANNOUNCEMENTS TABLE
-- Anúncios exibidos no card rotativo do início (AnnouncementCard).
-- Se a tabela já existir (criada manualmente), esta migration apenas garante
-- RLS, políticas e realtime — sem perder dados.
-- ============================================================================

create table if not exists public.announcements (
  id         uuid default gen_random_uuid() primary key,
  title      text not null,
  body       text,
  image_url  text,
  link       text,
  link_label text,
  is_active  boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

do $$ begin
  drop policy if exists "announcements_select_all" on public.announcements;
  create policy "announcements_select_all" on public.announcements
    for select using (true);
exception when duplicate_object then null;
end $$;

-- Escrita apenas via service_role (edge function admin-manage)
do $$ begin
  drop policy if exists "announcements_write_service" on public.announcements;
  create policy "announcements_write_service" on public.announcements
    for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists idx_announcements_active
  on public.announcements (is_active, sort_order, created_at desc);

-- Realtime para o card atualizar sem reiniciar a app
do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null;
end $$;
