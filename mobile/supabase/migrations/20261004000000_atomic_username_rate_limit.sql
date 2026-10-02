-- ============================================================================
-- RATE LIMIT DO LOGIN POR NOMEUNICo, ATOMICO
-- ---------------------------------------------------------------------------
-- A versao anterior vivia em JavaScript na edge function: lia a linha de
-- username_auth_attempts, decidia, e depois escrevia. Isso e read-then-write.
--
-- O QUE ISSO PERMITIA
-- N pedidos simultaneos com a senha errada liam a mesma linha (attempts = 4),
-- todos decidiam que o proximo numero era 5, e todos escreviam 5. O contador
-- subia 1 em vez de N e o bloqueio nunca chegava a disparar: um ataque de
-- forca bruta podia tentar senhas ilimitadas contra a mesma conta. O limite
-- de 5 tentativas nao era um limite, era uma sugestao.
--
-- A CORRECAO
-- A leitura, a decisao e a escrita passam a acontecer dentro de uma unica
-- funcao, numa transaccao, com SELECT ... FOR UPDATE a segurar a linha. O
-- primeiro pedido a chegar bloqueia a linha; os seguintes esperam e veem ja o
-- valor actualizado. Nenhuma tentativa se perde.
--
-- O incremento e a unica coisa que precisava de atomicidade. O teste "esta
-- bloqueado?" que corre antes de comparar a senha continua a ser uma leitura,
-- e isso e propositado: serve so para nao gastar um bcrypt quando nao ha nada
-- a fazer. Mesmo que dois pedidos passem esse teste ao mesmo tempo, ambos
-- contam a tentativa em username_auth_record_attempt e ambos sao contados.
--
-- Nao e necessario reescrever o resto do endpoint: createAccount e signIn
-- ficam iguais, so mudam as chamadas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Verificacao de bloqueio (leitura, antes de gastar um bcrypt)
-- ---------------------------------------------------------------------------
-- Devolve o instante ate que a conta fica bloqueada, ou null. Nao escreve
-- nada: um teste que escreve seria uma tentativa contada sem haver havido
-- tentativa.
create or replace function public.username_auth_is_locked(p_username text)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select a.locked_until
  from public.username_auth_attempts a
  where a.username = p_username
    and a.locked_until is not null
    and a.locked_until > now();
$$;

-- ---------------------------------------------------------------------------
-- 2. Registo de tentativa (a parte que tem de ser atomica)
-- ---------------------------------------------------------------------------
-- p_success = true  limpa o contador.
-- p_success = false conta uma falha, e devolve o novo estado ja com o
--               bloqueio aplicado se a ultima tentativa for a que estoura.
--
-- Devolve tambem retry_after_minutes para a mensagem de erro: os numeros vem
-- desta funcao e nao de constantes na edge function, para que as duas coisas
-- nao possam divergir.
create or replace function public.username_auth_record_attempt(
  p_username text,
  p_success boolean,
  p_max_attempts integer default 5,
  p_window_minutes integer default 15,
  p_lock_minutes integer default 30
)
returns table (locked boolean, remaining integer, retry_after_minutes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_attempts integer;
  v_window_started timestamptz;
  v_locked_until timestamptz;
  v_new_attempts integer;
  v_window interval := make_interval(mins => p_window_minutes);
begin
  if p_success then
    delete from public.username_auth_attempts a where a.username = p_username;
    return query select false, p_max_attempts, 0;
    return;
  end if;

  -- Garante que existe uma linha para poder ser bloqueada. on conflict do
  -- nothing trata o caso de outro pedido ter criado a linha entre o read e o
  -- write; o SELECT ... FOR UPDATE abaixo e que serializa o resto.
  insert into public.username_auth_attempts (username, attempts, window_started_at, locked_until)
  values (p_username, 0, v_now, null)
  on conflict (username) do nothing;

  -- O ponto critico. FOR UPDATE segura a exclusividade da linha ate ao fim
  -- desta transaccao, portanto os pedidos concorrentes ficam em fila aqui em
  -- vez de lerem o mesmo attempts ao mesmo tempo.
  select a.attempts, a.window_started_at, a.locked_until
    into v_attempts, v_window_started, v_locked_until
  from public.username_auth_attempts a
  where a.username = p_username
    for update;

  -- Ja bloqueado e ainda dentro do bloqueio: nao contamos mais nada, para nao
  -- esticar indefinidamente a penalizacao a cada pedido que chega.
  if v_locked_until is not null and v_locked_until > v_now then
    return query
      select true, 0,
        greatest(1, ceil(extract(epoch from (v_locked_until - v_now)) / 60.0)::integer);
    return;
  end if;

  -- A janela expirou: recomeca a contagem a partir de 1.
  if v_window_started is null or v_now - v_window_started > v_window then
    v_new_attempts := 1;
  else
    v_new_attempts := v_attempts + 1;
  end if;

  if v_new_attempts >= p_max_attempts then
    update public.username_auth_attempts a
      set attempts = v_new_attempts,
          window_started_at = v_now,
          locked_until = v_now + make_interval(mins => p_lock_minutes)
      where a.username = p_username;
    return query select true, 0, p_lock_minutes;
    return;
  end if;

  update public.username_auth_attempts a
    set attempts = v_new_attempts,
        window_started_at = v_now,
        locked_until = null
    where a.username = p_username;

  return query select false, p_max_attempts - v_new_attempts, 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Privilegios
-- ---------------------------------------------------------------------------
-- Como em verify_user_password: revogar a PUBLIC, que em Postgres tem EXECUTE
-- por omissao. Sem isto, um utilizador autenticado poderia trancar a conta de
-- outro a vontade, chamando username_auth_record_attempt com p_success = false
-- vezes o suficiente para o deixar bloqueado.
revoke all on function public.username_auth_is_locked(text) from public;
revoke all on function public.username_auth_is_locked(text) from anon;
revoke all on function public.username_auth_is_locked(text) from authenticated;
grant execute on function public.username_auth_is_locked(text) to service_role;

revoke all on function public.username_auth_record_attempt(text, boolean, integer, integer, integer) from public;
revoke all on function public.username_auth_record_attempt(text, boolean, integer, integer, integer) from anon;
revoke all on function public.username_auth_record_attempt(text, boolean, integer, integer, integer) from authenticated;
grant execute on function public.username_auth_record_attempt(text, boolean, integer, integer, integer) to service_role;

comment on function public.username_auth_is_locked(text) is
  'Instante ate que o username fica bloqueado, ou null. Leitura pura, nao conta tentativas.';
comment on function public.username_auth_record_attempt(text, boolean, integer, integer, integer) is
  'Conta uma falha (p_success = false) ou limpa o contador (p_success = true), atomicamente sob FOR UPDATE. So service_role.';
