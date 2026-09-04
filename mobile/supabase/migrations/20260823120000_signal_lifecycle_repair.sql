-- ─────────────────────────────────────────────────────────────────────────────
-- Reparo do ciclo de vida dos sinais
--
-- Sintoma: dezenas de sinais acumulados (ex.: fim de semana) sem entrada,
-- sem fecho e histórico vazio. Causas: expires_at nulo em sinais antigos
-- (a coluna foi adicionada depois), crons de fecho/expiração por vezes
-- ausentes e get_user_history() que só devolvia tp/sl.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Backfill: expires_at nulo → created_at + janela por timeframe
update public.signals s
set expires_at = s.created_at + (
  case upper(coalesce(s.timeframe, 'H1'))
    when 'M5'  then interval '2 hours'
    when 'M15' then interval '6 hours'
    when 'M30' then interval '12 hours'
    when 'H1'  then interval '24 hours'
    when 'H4'  then interval '72 hours'
    else interval '24 hours'
  end
)
where s.expires_at is null
  and s.status in ('active', 'pending');

-- 2. Expirar imediatamente tudo o que já passou da janela
update public.signals
set status = 'expired'
where status in ('active', 'pending')
  and expires_at is not null
  and expires_at < now();

-- 3. Histórico passa a incluir sinais expirados (resultado neutro no cliente)
create or replace function public.get_user_history(uid uuid default auth.uid())
returns setof public.signals
language sql
stable
security definer
set search_path = public
as $$
  with limits as (
    select case public.get_user_plan(uid)
      when 'premium' then -1
      when 'pro' then 30
      when 'basic' then 7
      else 1
    end as history_days
  )
  select s.*
  from public.signals s, limits l
  where s.status in ('tp', 'sl', 'expired')
    and public.user_can_access_pair(s.symbol, uid)
    and (
      l.history_days = -1
      or s.created_at >= now() - (l.history_days || ' days')::interval
    )
  order by s.created_at desc
  limit 200;
$$;

grant execute on function public.get_user_history(uuid) to authenticated;

-- 4. Reafirmar crons do ciclo de vida (idempotente)
do $$
begin
  -- Fechar TP/SL/entrada a cada 10 minutos
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-signals-every-10min') THEN
    PERFORM cron.unschedule('close-signals-every-30min');
    PERFORM cron.schedule('close-signals-every-10min', '*/10 * * * *', 'SELECT public.cron_close_signals()');
  END IF;

  -- Expirar sinais fora da janela a cada 15 minutos
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-old-signals-every-15min') THEN
    PERFORM cron.schedule('expire-old-signals-every-15min', '*/15 * * * *', $$SELECT public.expire_old_signals()$$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
end $$;

-- 5. Aviso alto se o segredo do pipeline ainda falta
do $$
begin
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'service_role_key' AND value <> '') THEN
    RAISE WARNING 'signal_lifecycle_repair: app_config.service_role_key em falta — close-signals via pg_cron falha em silencio';
  END IF;
end $$;
