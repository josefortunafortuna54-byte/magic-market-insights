-- ============================================================================
-- FREE PLAN: visibilidade de sinais crypto no fim-de-semana
-- Ao fim-de-semana só são gerados sinais crypto (BTCUSDT/ETHUSDT), mas estes
-- pares não estavam nas listas free/basic de user_can_access_pair() → os
-- utilizadores free ficavam sem NENHUM sinal ao sábado/domingo.
-- ============================================================================

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
    when 'basic' then upper(pair) in ('EURUSD','GBPUSD','USDJPY','AUDUSD','EURGBP','XAUUSD','BTCUSDT','ETHUSDT')
    else upper(pair) in ('EURUSD','GBPUSD','USDJPY','XAUUSD','AUDUSD','BTCUSDT','ETHUSDT')
  end;
$$;

grant execute on function public.user_can_access_pair(text, uuid) to authenticated;

do $$
begin
  raise log 'Free plan: weekend crypto pairs (BTCUSDT, ETHUSDT) visible to all tiers';
end $$;
