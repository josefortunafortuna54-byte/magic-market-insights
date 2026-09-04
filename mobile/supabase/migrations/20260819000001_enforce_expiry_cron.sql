-- Enforce signal expiry: mark signals as expired when expires_at has passed
-- Runs every 15 minutes via pg_cron

-- 1. Function to expire old signals
create or replace function public.expire_old_signals()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signals
  set status = 'expired'
  where status in ('active', 'pending')
    and expires_at is not null
    and expires_at < now();

  raise log 'expire_old_signals: marked % signals as expired', found;
end;
$$;

-- 2. Schedule cron job every 15 minutes
SELECT cron.schedule(
  'expire-old-signals-every-15min',
  '*/15 * * * *',
  $$SELECT public.expire_old_signals()$$
);

-- 3. Log
do $$
begin
  raise log 'Expire signals cron job created: every 15 minutes';
end $$;
