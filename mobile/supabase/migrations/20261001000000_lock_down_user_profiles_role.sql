-- ============================================================================
-- LOCK DOWN user_profiles.role
-- ---------------------------------------------------------------------------
-- As políticas RLS de user_profiles restringem a LINHA (user_id = auth.uid())
-- mas não restringem a COLUNA. O RLS do Postgres não sabe nada de colunas, e
-- "with check (user_id = auth.uid())" continua verdadeiro se o update também
-- escrever noutras colunas. Consequência: qualquer utilizador autenticado
-- podia escrever role = 'admin' na sua própria linha.
--
-- E role = 'admin' é a fonte de verdade no banco para:
--   - 20260821000001_channel_management.sql  (insert/update/delete em channels)
--   - 20260821000000_message_reports.sql     (insert/update em message_reports)
--
-- O vector não é teórico: usePresence.ts faz upsert em user_profiles no
-- arranque e a cada 60 s, pelo que a escrita já está a acontecer. Bastava
-- acrescentar role ao payload.
--
-- A correcção é um trigger, não uma policy nova: o RLS não consegue expressar
-- "esta coluna só pode mudar se a chamada vier com service_role".
-- ============================================================================

-- 1) Impedir que um utilizador escreva role (ou troque o proprio user_id).
--    INSERT  -> role e user_id são forzados aos valores permitidos.
--    UPDATE  -> role e user_id são repostos tal como estavam.
--    As escritas legítimas de admin passam pelo edge function admin-manage com
--    service_role, que é o único caminho com bypass de RLS.
create or replace function public.lock_user_profiles_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (admin-manage, update_user_role) passa intacto. O JWT traz
  -- role = 'service_role' e o PostgREST expoe-o via auth.role().
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- auth.uid() e a unica fonte de identidade que um utilizador pode
    -- fornecer. Se vier nulo (caminho anonimo) deixamos o insert falhar na
    -- policy, em vez de inventar um user_id.
    new.user_id := auth.uid();
    new.role    := 'member';
  else
    new.user_id := old.user_id;
    new.role    := old.role;
  end if;

  return new;
end;
$$;

-- 2) Ligar o trigger. IF NOT EXISTS nao existe para CREATE TRIGGER, por isso
--    drop + create. O trigger e BEFORE, por isso corre antes de a policy
--    avaliar o "with check".
drop trigger if exists trg_lock_user_profiles_role on public.user_profiles;
create trigger trg_lock_user_profiles_role
  before insert or update on public.user_profiles
  for each row
  execute function public.lock_user_profiles_role();

-- 3) trigger_upsert_pair_room_* e trigger_limit_conversation_members ficam em
--    public e so correm sobre outras tabelas; nada a fazer aqui.
