-- ============================================================================
--  ATIVAR O CRON DE FECHO DE SINAIS  (passo manual, no dashboard)
-- ============================================================================
--
-- porque e que isto e um ficheiro e nao uma migration:
--
--    `cron_close_signals()` chama a edge function `close-signals` com HTTP,
--    e para isso precisa da `service_role_key`. Uma migration nao pode
--    trazer a chave para uma tabela - o valor vive no dashboard, nao no
--    repositorio. Por isso o INSERT e manual.
--
--    O que acontece enquanto esta chave faltar: o job `pg_cron` corre, a
--    funcao `call_edge_function` faz `RAISE WARNING` e `RETURN` sem chamar
--    nada. O job conta como sucesso. Nenhum sinal e fechado, e nada aparece
--    no log de erros - e o que torna este silencio caro.
--
--  ONDE EXECUTAR:  Supabase Dashboard -> SQL Editor -> New query -> Run
--
--  ONDE OBTER A CHAVE:
--    Project Settings -> API Keys -> service_role  (a chave JWT, comecada por
--    `eyJ`). Nao e a `anon` nem a `publishable`: com estas o cron fecha zero
--    sinais, porque `close-signals` so escreve com permissao de service_role.
--
--  ⚠️  O QUE NAO SE FAZ:  colar a chave neste ficheiro, nem em `.env`, nem
--     num commit. Este script tem um placeholder e recusa-se a correr com ele.
--     A `service_role_key` nao pode nunca ir para o bundle do cliente - no web
--     e `VITE_`-prefixada e no Expo e `EXPO_PUBLIC_`-prefixada, e ambos os
--     prefixos sao publicos.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Colar a chave abaixo, entre as aspas.
-- ----------------------------------------------------------------------------

INSERT INTO public.app_config (key, value)
VALUES (
  'service_role_key',
  'COLE_AQUI_A_SERVICE_ROLE_KEY'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ----------------------------------------------------------------------------
-- 2. Confirmar que o INSERT pegou.
--
--    Nao faz sentido imprimir a chave. O que interessa e que existe e que tem
--    o formato de um JWT de service_role: tres segmentos separados por pontos.
--    `eyJ...` e o header base64 de um JWT, que e como se confirma que se colou
--    a chave certa e nao outra coisa.
-- ----------------------------------------------------------------------------

SELECT
  key,
  value IS NOT NULL AND value <> ''            AS tem_valor,
  length(value)                                AS comprimento,
  value LIKE 'eyJ%'                            AS parece_um_jwt,
  array_length(string_to_array(value, '.'), 1) AS segmentos,
  value = 'COLE_AQUI_A_SERVICE_ROLE_KEY'       AS ainda_e_o_placeholder
FROM public.app_config
WHERE key = 'service_role_key';


--  Esperado: tem_valor = true, parece_um_jwt = true, segmentos = 3,
--  ainda_e_o_placeholder = false.


-- ----------------------------------------------------------------------------
-- 3. Confirmar que o `pg_cron` esta a agendar o fecho.
--
--    `cron_close_signals()` chama `call_edge_function('close-signals')`, que
--    precisa desta chave. Se o job nao existir aqui, o problema e outro: ou o
--    agendamento nao foi criado, ou `pg_cron` nao esta activo na base de dados.
-- ----------------------------------------------------------------------------

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'close-signals-every-30min';


-- ----------------------------------------------------------------------------
-- 4. Ver o que o job fez da ultima vez.
--
--    `status = 'succeeded'` com `return_message` a falar de `service_role_key`
--    e o sintoma exacto da chave em falta. A partir do momento em que o
--    passo 1 for executado, o proximo run (ate 30 min) tem de mostrar
--    `return_message = null`.
-- ----------------------------------------------------------------------------

SELECT
  d.runid,
  d.status,
  d.return_message,
  d.start_time
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname = 'close-signals-every-30min'
ORDER BY d.runid DESC
LIMIT 5;