-- ============================================================================
-- ADMIN ALERTS — todos os eventos
--
-- 1. Alarga o CHECK de admin_notifications.type com os eventos de aprovação.
-- 2. Trigger em auth.users: novo registo entra no sino do admin.
-- 3. Triggers de transição de estado: comprovativos, levantamentos e pedidos de
--    gerenciamento aprovados/recusados/pagos também ficam registados.
--
-- O fan-out para email/push/WhatsApp/SMS é feito pela edge function
-- `admin-alert`, chamada pelos clientes após o evento. Estes triggers garantem
-- que o registo in-app nunca se perde, mesmo que o cliente falhe.
-- ============================================================================

-- ── 1. Tipos aceites ────────────────────────────────────────────────────────
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.admin_notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.admin_notifications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.admin_notifications
  add constraint admin_notifications_type_check check (type in (
    'receipt_pending','receipt_approved','receipt_rejected',
    'withdrawal_pending','withdrawal_approved','withdrawal_rejected','withdrawal_paid',
    'signal_closed','signal_tp','signal_sl',
    'new_user','subscription_expired','subscription_expiring',
    'management_request_pending','management_request_approved','management_request_rejected',
    'message_report_pending',
    'system_error'
  ));

-- ── 2. Novo registo ─────────────────────────────────────────────────────────
create or replace function public.fn_trg_new_user_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications
    (type, title, message, entity_type, entity_id, data)
  values (
    'new_user',
    'Novo registo',
    coalesce(new.email, 'Utilizador'),
    'user',
    new.id,
    jsonb_build_object('email', new.email, 'created_at', new.created_at)
  );
  return new;
end $$;

drop trigger if exists trg_admin_new_user_notify on auth.users;
create trigger trg_admin_new_user_notify
  after insert on auth.users
  for each row execute function public.fn_trg_new_user_notify();

-- ── 3. Comprovativos aprovados/recusados ────────────────────────────────────
create or replace function public.fn_trg_receipt_status_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    insert into public.admin_notifications
      (type, title, message, entity_type, entity_id, data)
    values (
      'receipt_' || new.status,
      case when new.status = 'approved' then 'Comprovativo aprovado'
           else 'Comprovativo recusado' end,
      coalesce(new.user_email, 'Utilizador') || ' | ' || coalesce(new.plan, '?')
        || ' | ' || coalesce(new.amount::text, '') || ' ' || coalesce(new.currency, ''),
      'receipt',
      new.id,
      jsonb_build_object(
        'email', new.user_email,
        'status', new.status,
        'plan', new.plan,
        'amount', new.amount,
        'currency', new.currency
      )
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_admin_receipt_status_notify on public.payment_receipts;
create trigger trg_admin_receipt_status_notify
  after update of status on public.payment_receipts
  for each row execute function public.fn_trg_receipt_status_notify();

-- ── 4. Levantamentos aprovados/recusados/pagos ──────────────────────────────
create or replace function public.fn_trg_withdrawal_status_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected', 'paid') then
    select email into v_email from auth.users where id = new.user_id;

    insert into public.admin_notifications
      (type, title, message, entity_type, entity_id, data)
    values (
      'withdrawal_' || new.status,
      case new.status
        when 'approved' then 'Levantamento aprovado'
        when 'rejected' then 'Levantamento recusado'
        else 'Levantamento pago'
      end,
      coalesce(v_email, new.user_id::text) || ' | ' || coalesce(new.method, '?')
        || ' | ' || coalesce(new.amount::text, '') || ' ' || coalesce(new.currency, ''),
      'withdrawal',
      new.id,
      jsonb_build_object(
        'email', v_email,
        'status', new.status,
        'method', new.method,
        'amount', new.amount,
        'currency', new.currency
      )
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_admin_withdrawal_status_notify on public.withdrawal_requests;
create trigger trg_admin_withdrawal_status_notify
  after update of status on public.withdrawal_requests
  for each row execute function public.fn_trg_withdrawal_status_notify();

-- ── 5. Pedidos de gerenciamento aprovados/recusados ────────────────────────
create or replace function public.fn_trg_management_status_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    select email into v_email from auth.users where id = new.user_id;

    insert into public.admin_notifications
      (type, title, message, entity_type, entity_id, data)
    values (
      'management_request_' || new.status,
      case when new.status = 'approved' then 'Gerenciamento aprovado'
           else 'Gerenciamento recusado' end,
      coalesce(v_email, new.user_id::text) || ' | ' || coalesce(new.plan_id, '?')
        || ' | ' || upper(coalesce(new.currency, 'usd')),
      'management_request',
      new.id,
      jsonb_build_object(
        'email', v_email,
        'status', new.status,
        'plan_id', new.plan_id,
        'currency', new.currency
      )
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_admin_management_status_notify on public.capital_management_requests;
create trigger trg_admin_management_status_notify
  after update of status on public.capital_management_requests
  for each row execute function public.fn_trg_management_status_notify();

-- ── 6. Denúncias de mensagens ──────────────────────────────────────────────
create or replace function public.fn_trg_message_report_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = new.reporter_id;

  insert into public.admin_notifications
    (type, title, message, entity_type, entity_id, data)
  values (
    'message_report_pending',
    'Nova denúncia de mensagem',
    coalesce(v_email, new.reporter_id::text) || ' | ' || new.reason,
    'message_report',
    new.id,
    jsonb_build_object(
      'email', v_email,
      'reporter_id', new.reporter_id,
      'message_id', new.message_id,
      'reason', new.reason,
      'details', new.details
    )
  );
  return new;
end $$;

drop trigger if exists trg_admin_message_report_notify on public.message_reports;
create trigger trg_admin_message_report_notify
  after insert on public.message_reports
  for each row execute function public.fn_trg_message_report_notify();
