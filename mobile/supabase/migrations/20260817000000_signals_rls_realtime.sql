-- ---------------------------------------------------------------------------
-- signals: tabela, RLS e realtime
-- A tabela pode já existir no Supabase (criada manualmente ou por migration
-- não versionada). Usamos CREATE TABLE IF NOT EXISTS para idempotência.
-- ---------------------------------------------------------------------------

-- 1. Tabela (idempotente)
create table if not exists public.signals (
  id              uuid primary key default gen_random_uuid(),
  symbol          text        not null,
  timeframe       text        not null default 'H1',
  signal_type     text        not null default 'BUY',
  entry_price     numeric     not null,
  stop_loss       numeric     not null,
  target_price    numeric     not null,
  confidence      numeric     not null default 75,
  reasons         jsonb       not null default '[]'::jsonb,
  status          text        not null default 'active',
  created_at      timestamptz not null default now(),
  expires_at      timestamptz,
  analysis        text,
  probability_score numeric
);

-- 2. Comentários de colunas (opcional mas útil para documentação)
comment on column public.signals.symbol        is 'Par de trading (ex: EURUSD, BTCUSDT)';
comment on column public.signals.timeframe     is 'Timeframe do sinal (M15, H1, H4, D1)';
comment on column public.signals.signal_type   is 'Tipo: BUY, SELL ou AGUARDAR';
comment on column public.signals.status        is 'active, pending, tp, sl ou expired';
comment on column public.signals.reasons       is 'Array de razões técnicas em português';

-- 3. RLS
alter table public.signals enable row level security;

-- SELECT: qualquer utilizador autenticado pode ver sinais
drop policy if exists signals_select_auth on public.signals;
create policy signals_select_auth on public.signals
  for select to authenticated
  using (true);

-- INSERT: apenas service_role (edge functions com service_role key)
drop policy if exists signals_insert_service on public.signals;
create policy signals_insert_service on public.signals
  for insert to service_role
  with check (true);

-- UPDATE: apenas service_role (admin-manage, close-signals)
drop policy if exists signals_update_service on public.signals;
create policy signals_update_service on public.signals
  for update to service_role
  using (true)
  with check (true);

-- DELETE: apenas service_role (admin-manage)
drop policy if exists signals_delete_service on public.signals;
create policy signals_delete_service on public.signals
  for delete to service_role
  using (true);

-- 4. Realtime publication
do $$
begin
  alter publication supabase_realtime add table public.signals;
exception when duplicate_object then null;
end $$;

-- 5. Índices para performance
create index if not exists idx_signals_status_created on public.signals (status, created_at desc);
create index if not exists idx_signals_symbol on public.signals (symbol);
