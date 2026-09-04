-- ============================================================================
-- EXPANDIR PLANO FREE: Mais pares + H1
-- Free: EUR/USD, GBP/USD, USD/JPY, XAU/USD, AUD/USD + M15, H1
-- Basic: EUR/USD, GBP/USD, USD/JPY, AUD/USD, EUR/GBP, XAU/USD + M15, H1
-- Pro: todos + M15, H1, H4
-- Premium: tudo ilimitado
-- ============================================================================

-- Atualizar pares permitidos para free (adicionar XAUUSD e AUDUSD)
create or replace function public.user_can_access_pair(
  pair text,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.get_user_plan(uid)
    when 'premium' then true
    when 'pro' then true
    when 'basic' then upper(pair) in ('EURUSD','GBPUSD','USDJPY','AUDUSD','EURGBP','XAUUSD')
    else upper(pair) in ('EURUSD','GBPUSD','USDJPY','XAUUSD','AUDUSD')
  end;
$$;

grant execute on function public.user_can_access_pair(text, uuid) to authenticated;

-- Atualizar timeframes permitidos para free (adicionar H1)
create or replace function public.user_can_access_timeframe(
  tf text,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.get_user_plan(uid)
    when 'premium' then true
    when 'pro' then tf in ('M15','H1','H4')
    when 'basic' then tf in ('M15','H1')
    else tf in ('M15','H1')
  end;
$$;

grant execute on function public.user_can_access_timeframe(text, uuid) to authenticated;

do $$
begin
  raise log 'Free plan expanded: pairs (EURUSD,GBPUSD,USDJPY,XAUUSD,AUDUSD) + timeframes (M15,H1)';
end $$;
