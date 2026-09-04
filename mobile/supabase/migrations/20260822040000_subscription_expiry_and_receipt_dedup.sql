-- ============================================================================
-- ANTI-BURLA: expiração automática de subscrições + deteção de duplicados
-- ============================================================================
--
-- 1) expire_old_subscriptions(): marca subscrições como 'expired' quando o
--    período termina (current_period_end / expires_at) e avisa o utilizador
--    no centro de notificações. Corre à hora via pg_cron.
-- 2) get_user_plan() passa a validar também as datas — mesmo entre execuções
--    do cron, uma subscrição fora da validade deixa de dar acesso premium.
-- 3) payment_receipts.duplicate_of: trigger BEFORE INSERT marca recibos que
--    repetem o mesmo ficheiro ou o mesmo conjunto plano/método/valor dos
--    últimos 30 dias do mesmo utilizador, para revisão do admin.
-- ============================================================================

-- ── 1. Expiração automática ────────────────────────────────────────────────

create or replace function public.expire_old_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with expired as (
    update public.subscriptions s
    set status = 'expired',
        updated_at = now()
    where s.status = 'active'
      and coalesce(s.current_period_end, s.expires_at) is not null
      and coalesce(s.current_period_end, s.expires_at) < now()
    returning s.user_id
  )
  insert into public.user_notifications (user_id, title, body, kind)
  select e.user_id,
         'Subscrição expirada',
         'A sua subscrição terminou. Renove para continuar com acesso premium.',
         'plan'
  from expired e;

  raise log 'expire_old_subscriptions: processado';
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-subscriptions-hourly') then
    perform cron.unschedule('expire-subscriptions-hourly');
  end if;
end $$;

SELECT cron.schedule(
  'expire-subscriptions-hourly',
  '5 * * * *',
  $$SELECT public.expire_old_subscriptions()$$
);

-- ── 2. get_user_plan respeita datas de validade ───────────────────────────

create or replace function public.get_user_plan(uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select lower(s.plan)
      from public.subscriptions s
      where s.user_id = uid
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
        and (s.expires_at is null or s.expires_at > now())
      limit 1
    ),
    'free'
  );
$$;

grant execute on function public.get_user_plan(uuid) to authenticated;

-- ── 3. Deteção de comprovativos duplicados ────────────────────────────────

alter table public.payment_receipts
  add column if not exists duplicate_of uuid references public.payment_receipts(id);

create or replace function public.flag_duplicate_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dup uuid;
begin
  -- Mesmo ficheiro já submetido anteriormente pelo utilizador
  select r.id into dup
  from public.payment_receipts r
  where r.user_id = new.user_id
    and r.proof_url = new.proof_url
    and r.id <> new.id
  order by r.created_at desc
  limit 1;

  -- Alternativa: mesmo plano/método/valor nos últimos 30 dias
  if dup is null then
    select r.id into dup
    from public.payment_receipts r
    where r.user_id = new.user_id
      and r.id <> new.id
      and r.amount = new.amount
      and lower(r.method) = lower(new.method)
      and lower(r.plan) = lower(new.plan)
      and r.created_at > now() - interval '30 days'
    order by r.created_at desc
    limit 1;
  end if;

  new.duplicate_of := dup;
  return new;
end;
$$;

drop trigger if exists trg_flag_duplicate_receipt on public.payment_receipts;
create trigger trg_flag_duplicate_receipt
before insert on public.payment_receipts
for each row execute function public.flag_duplicate_receipt();
