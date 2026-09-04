-- ============================================================================
-- STORE PRODUCTS TABLE
-- Substitui os STORE_ITEMS hardcoded no cliente (loja.tsx) por catálogo
-- server-side: a equipa gere produtos/preços sem nova build da app.
-- Leitura pública (autenticados); escrita só via service_role/admin.
-- ============================================================================

create table if not exists public.store_products (
  id          uuid default gen_random_uuid() primary key,
  slug        text not null unique,
  title       text not null,
  description text not null,
  category    text not null check (category in ('bots', 'mentorias', 'ebooks')),
  price       text not null,
  currency    text not null default 'aoa',
  icon        text not null,               -- nome de ícone Ionicons
  color       text not null default '#7C3AED',
  is_premium  boolean not null default false,
  featured    boolean not null default false,
  rating      numeric(2,1),
  users_count integer,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.store_products enable row level security;

do $$ begin
  drop policy if exists "sp_select_all" on public.store_products;
  create policy "sp_select_all" on public.store_products
    for select to authenticated
    using (active = true);
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "sp_write_service" on public.store_products;
  create policy "sp_write_service" on public.store_products
    for all to service_role
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists idx_sp_category on public.store_products (category);
create index if not exists idx_sp_active on public.store_products (active, sort_order);

-- Auto-update updated_at
create or replace function public.update_sp_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sp_updated on public.store_products;
create trigger trg_sp_updated before update on public.store_products
  for each row execute function public.update_sp_timestamp();

-- Seed inicial = itens actuais do cliente (loja.tsx), idempotente por slug
insert into public.store_products (slug, title, description, category, price, icon, color, is_premium, featured, rating, users_count, sort_order)
values
  ('bot-scalper-pro', 'Bot Scalper Pro', 'Bot automatizado para operações de scalping em boom com gestão de risco avançada.', 'bots', '5.000 Kz', 'rocket-outline', '#FF6B6B', true, true, 4.8, 342, 10),
  ('bot-swing-trader', 'Bot Swing Trader', 'Bot para operações de swing com trailing stop e filtros de volatilidade.', 'bots', '3.500 Kz', 'trending-up-outline', '#4ECDC4', true, false, 4.6, 218, 20),
  ('bot-sinalizador', 'Bot Sinalizador', 'Bot que envia sinais em tempo real para seu canal de trading.', 'bots', 'Grátis', 'notifications-outline', '#45B7D1', false, false, 4.3, 891, 30),
  ('mentoria-individual', 'Mentoria Individual', 'Acompanhamento personalizado com trader profissional. Sessões ao vivo e análise de portfolio.', 'mentorias', '15.000 Kz', 'school-outline', '#96CEB4', true, true, 4.9, 56, 40),
  ('mentoria-grupo', 'Mentoria em Grupo', 'Aprenda em grupo com sessões semanais ao vivo e comunidade exclusiva.', 'mentorias', '5.000 Kz', 'people-outline', '#FFEAA7', false, false, 4.5, 234, 50),
  ('ebook-fundamentos', 'Ebook: Fundamentos', 'Guia completo de análise fundamentalista para boom. Do básico ao avançado.', 'ebooks', 'Grátis', 'book-outline', '#DDA0DD', false, false, 4.2, 1203, 60),
  ('ebook-estrategias', 'Ebook: Estratégias Avançadas', 'Estratégias profissionais de trading com exemplos reais e backtests.', 'ebooks', '2.500 Kz', 'library-outline', '#FF9FF3', true, false, 4.7, 445, 70),
  ('ebook-gestao-risco', 'Ebook: Gestão de Risco', 'Aprenda a proteger seu capital e maximizar lucros com gestão profissional.', 'ebooks', '1.500 Kz', 'shield-checkmark-outline', '#54A0FF', false, false, 4.4, 678, 80)
on conflict (slug) do nothing;
