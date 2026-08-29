-- Fim de semana: apenas crypto — mercado forex/ouro fechado
-- 1) helpers; 2) triggers de salas de pares com guarda; 3) limpeza do fim de semana
-- Run this whole file once in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_weekend_utc()
returns boolean language sql stable as $$
  select extract(dow from now()) in (0, 6);
$$;

create or replace function public.is_forex_pair(sym text)
returns boolean language sql stable as $$
  select upper(regexp_replace(coalesce(sym, ''), '[^A-Za-z]', '', 'g')) in (
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'EURGBP',
    'USDCHF', 'NZDUSD', 'USDCAD', 'XAUUSD'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Triggers guardados: ao fim de semana só crypto abre sala de pares
-- ---------------------------------------------------------------------------
create or replace function public.trigger_upsert_pair_room_boom()
returns trigger language plpgsql security definer as $$
begin
  if public.is_weekend_utc() and public.is_forex_pair(new.pair) then
    return new;
  end if;
  perform public.upsert_pair_room(new.pair);
  return new;
end;
$$;

create or replace function public.trigger_upsert_pair_room_signal()
returns trigger language plpgsql security definer as $$
begin
  if public.is_weekend_utc() and public.is_forex_pair(new.symbol) then
    return new;
  end if;
  perform public.upsert_pair_room(new.symbol);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Limpeza: salas de pares forex abertas nas últimas 48h (fim de semana)
-- ---------------------------------------------------------------------------
delete from public.channels
where type = 'pair'
  and opened_at > now() - interval '48 hours'
  and public.is_forex_pair(coalesce(pair, name));
