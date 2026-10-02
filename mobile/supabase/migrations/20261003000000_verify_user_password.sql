-- ============================================================================
-- VERIFICACAO DE SENHA PARA O LOGIN POR NOMEUNICo
-- ---------------------------------------------------------------------------
-- username-auth precisa de comparar a senha que o utilizador escreve com o
-- hash guardado em auth.users.encrypted_password (bcrypt, $2a$).
--
-- POR QUE ISTO E SQL E NAO JS
-- A via obvia seria supabase.auth.admin.getUserById(id).password_hash. Nao
-- funciona: o interface User que esse metodo devolve (auth-js
-- lib/types.d.ts, `export interface User`) nao tem password_hash. O campo
-- password_hash existe no tipo AdminUserAttributes, que e o que se ENVIa em
-- createUser/updateUser -- ou seja, entrada, nao saida. Ler o hash via
-- .schema('auth').from('users') depende de o schema auth estar exposto no
-- PostgREST, o que nao e garantido num projeto alojado.
--
-- Por isso a comparacao acontece dentro da base de dados, com pgcrypto. O hash
-- nunca sai de auth.users: nem para o edge function, nem para o cliente. O
-- unico valor que circula e um booleano.
--
-- crypt() do pgcrypto suporta Blowfish/bcrypt, que e o formato que o GoTrue
-- guarda. Bcrypt e propositadamente lento, e a funcao corre sempre, mesmo sem
-- utilizador, para nao distinguir "username inexistente" de "senha errada" por
-- tempo de resposta.
-- ============================================================================

create or replace function public.verify_user_password(usr uuid, pwd text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (
      select u.encrypted_password = extensions.crypt(pwd, u.encrypted_password)
      from auth.users u
      where u.id = usr
    ),
    -- Username inexistente, ou conta sem senha (ex.: Google). Compara contra um
    -- hash descartavel: o resultado e false, mas o crypt corre na mesma, para
    -- que o endpoint nao vire um enumerador de contas por temporizacao.
    extensions.crypt(pwd, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
      = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
  );
$$;

-- Funcao nova: EXECUTE e concedido a PUBLIC por omissao em Postgres. Sem este
-- revoke, qualquer utilizador autenticado poderia chamar verify_user_password e
-- usa-la para adivinhar senhas alheias -- a mesma razao pela qual username-auth
-- precisa de service_role.
revoke all on function public.verify_user_password(uuid, text) from public;
revoke all on function public.verify_user_password(uuid, text) from anon;
revoke all on function public.verify_user_password(uuid, text) from authenticated;
grant execute on function public.verify_user_password(uuid, text) to service_role;

comment on function public.verify_user_password(uuid, text) is
  'Compara uma senha com auth.users.encrypted_password e devolve so um booleano. '
  'So o service_role (edge function username-auth) pode executar. Nunca devolve o hash.';
