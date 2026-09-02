create or replace function public.share_signal(p_signal_id uuid, p_user_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_channel_id uuid;
  v_msg_id uuid;
  v_existing uuid;
  v_text text;
  s public.signals%rowtype;
begin
  if p_user_id <> auth.uid() then
    raise exception 'share_signal: não autorizado';
  end if;

  select id into v_channel_id from public.channels where name = 'sinais';
  if v_channel_id is null then
    raise exception 'share_signal: canal #sinais não encontrado';
  end if;

  select * into s from public.signals where id = p_signal_id;
  if s.id is null then
    raise exception 'share_signal: sinal não encontrado';
  end if;

  v_msg_id := md5('share:' || p_signal_id::text || ':' || p_user_id::text)::uuid;

  select id into v_existing from public.messages where client_msg_id = v_msg_id;
  if v_existing is not null then
    return v_existing;
  end if;

  v_text := '🎯 ' || s.symbol || ' ' || s.timeframe || ' ' || upper(s.signal_type)
    || ' — Entrada ' || to_char(s.entry_price, 'FM9999990.00')
    || ' | TP ' || to_char(s.target_price, 'FM9999990.00')
    || ' | SL ' || to_char(s.stop_loss, 'FM9999990.00')
    || ' | Confiança ' || coalesce(round(s.confidence), 0)::text || '%';

  insert into public.messages (channel_id, user_id, text, client_msg_id)
  values (v_channel_id, p_user_id, v_text, v_msg_id)
  returning id into v_existing;

  return v_existing;
end;
$$;

grant execute on function public.share_signal(uuid, uuid) to authenticated;
