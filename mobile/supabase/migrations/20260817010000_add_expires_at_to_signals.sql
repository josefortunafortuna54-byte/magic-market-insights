-- Adicionar coluna expires_at se não existir (tabela pode ter sido criada sem ela)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'signals' and column_name = 'expires_at'
  ) then
    alter table public.signals add column expires_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'signals' and column_name = 'analysis'
  ) then
    alter table public.signals add column analysis text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'signals' and column_name = 'probability_score'
  ) then
    alter table public.signals add column probability_score numeric;
  end if;
end $$;

-- Garantir que a publicação realtime inclui a tabela
do $$
begin
  alter publication supabase_realtime add table public.signals;
exception when duplicate_object then null;
end $$;
