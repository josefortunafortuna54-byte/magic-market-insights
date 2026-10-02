-- O CHECK de username deixa passar um username que a edge function e os dois
-- ecras rejeitam: 'wa' seguido de digitos.
--
-- Essa reserva existe porque um username 'wa244821999999' produz o email
-- sintetico wa244821999999@tmt.local, que e exactamente o email de uma conta de
-- WhatsApp. A unica constraint que o Postgres obriga era a que nao a tinha.
-- O comentario no codigo affirmava que as tres regras eram iguais, o que as
-- tornava iguais na intencao e nao na pratica.
--
-- Recria-se a constraint em vez de a alterar: nao existe ALTER CONSTRAINT com
-- uma expressao nova, so com USING para índices. E o que muda aqui e a
-- expressao.

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
      and username !~ '^wa[0-9]+$'
    )
  );
