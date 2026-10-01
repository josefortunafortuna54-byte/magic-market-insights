-- ============================================================================
-- USERNAME AUTH
-- ---------------------------------------------------------------------------
-- Objetivo: um ecra de login so com botoes -- Google, WhatsApp, e
-- "NomeUnico + senha". O terceiro precisa de duas coisas:
--   1) um utilizador JA existente (email real + password) entrar com username
--   2) alguem SEM conta criar conta a partir de username + password
--
-- O Supabase Auth so autentica por email, entao o username tem de ser
-- resolvido para um email algures. Ver mobile/supabase/functions/username-auth/.
--
-- DECISAO: sem backfill de usernames a partir do email.
-- A ideia original era preencher username = parte local do email. Isso
-- publica o email de toda a gente: 'user_profiles' tem select ... using(true)
-- (authenticated ve todas as linhas) e o username aparece na comunidade. Os
-- contas de WhatsAppiltrariam o telefone -- 'wa244821999999' -- o que e pior.
-- Por isso username comeca NULL e cada um o reclama uma vez, autenticado com a
-- sua senha actual. Nao ha backfill, nao ha mudanca de privacidade, e nao ha
-- forma de alguém Tombar o nome de outro.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Coluna + unicidade
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists username text;

-- 3 a 30 chars, minusculas, comeca e acaba em alfanumerico. Pontos, underscore
-- e hifen permitidos no meio para nomes tipo 'joao.silva' ou 'maria-lucia'.
alter table public.user_profiles
  drop constraint if exists user_profiles_username_format;
alter table public.user_profiles
  add constraint user_profiles_username_format
  check (
    username is null
    or (
      char_length(username) between 3 and 30
      and username = lower(username)
      and username ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'
    )
  );

-- Unique e parcial: nulls repetidos nao choca, e o indice so cobre quem tem
-- username, para nao pesar as linhas da comunidade.
create unique index if not exists user_profiles_username_key
  on public.user_profiles (username)
  where username is not null;

comment on column public.user_profiles.username is
  'Apelido unico, escolhido pelo utilizador. NAO deriva do email (ver cabecalho). '
  'So pode ser escrito pelo edge function username-auth, nunca pelo cliente.';

-- ---------------------------------------------------------------------------
-- 2) username passa a ser coluna protegida
-- ---------------------------------------------------------------------------
-- A migration anterior (20261001000000) tranca user_id e role. Aqui estende-se
-- a mesma regra ao username, porque a policy 'profiles_update_own' e
-- with check (user_id = auth.uid()) -- ou seja, um utilizador pode escrever
-- QUALQUER coluna da sua linha. Sem isto, qualquer um renomeava a si proprio
-- para o username de outro, ou tomava um nome que outro ia registar.
--
-- So o edge function username-auth (service_role, depois de verificar a senha)
-- escreve username. Um utilizador so consegue ter UM, para sempre.
create or replace function public.lock_user_profiles_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- admin-manage / update_user_role, a unica via legitima de promocao, usa
  -- service_role. Passa intacto. Bypass de RLS vem tambem do JWT.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.role    := 'member';
  else
    new.user_id := old.user_id;
    new.role    := old.role;
  end if;

  -- username so em service_role. O INSERT de usePresence.ts (display_name,
  -- status, last_seen_at) continua a funcionar porque nao toca nesta coluna.
  new.username := old.username;

  return new;
end;
$$;

-- O trigger trg_lock_user_profiles_role ja aponta para a funcao antiga; como
-- e create or replace, a ligacao mantem-se e passa a chamar esta. Ainda assim
-- recria-se explicitamente para o nome do trigger reflects o que ele faz.
drop trigger if exists trg_lock_user_profiles_identity on public.user_profiles;
create trigger trg_lock_user_profiles_identity
  before insert or update on public.user_profiles
  for each row
  execute function public.lock_user_profiles_identity();

drop trigger if exists trg_lock_user_profiles_role on public.user_profiles;

-- ---------------------------------------------------------------------------
-- 3) Limite de tentativas
-- ---------------------------------------------------------------------------
-- username-auth verifica a senha no servidor (bcrypt sobre auth.users), o que
-- o torna um oraculo de credenciais. bcrypt e lento (~100 ms), mas edge
-- functions correm em paralelo e nao ha serializacao: sem esta tabela, um
-- atacante abre 50 requests e testa 50 senhas de uma vez.
--
-- Espelha o desenho de whatsapp_otp: chave, contador, janela, bloqueio.
create table if not exists public.username_auth_attempts (
  username text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.username_auth_attempts enable row level security;

-- Sem policies de utilizador: so o service_role (username-auth) le e escreve.
-- Um default e o RLS sem policies e bloquear tudo, mas dizemo-lo explicitamente
-- para o objectivo nao depender de defaults.
revoke all on public.username_auth_attempts from anon, authenticated;
grant all on public.username_auth_attempts to service_role;
