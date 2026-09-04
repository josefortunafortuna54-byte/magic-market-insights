-- ============================================================================
-- ECOSSISTEMA DE QUOTAS DE IA POR PLANO
-- ============================================================================
--
-- Registo de todo o consumo da IA (chat e análise de imagem) por utilizador.
-- A edge function ai-support verifica a quota ANTES de chamar a Gemini através
-- da função consume_ai_quota() — atómica, evita ultrapassagens em pedidos
-- simultâneos. Limites por plano ficam definidos na própria edge function;
-- aqui recebem-se como parâmetros.
--
-- RLS ativada SEM policies: apenas a service_role (edge functions) acede.
-- ============================================================================

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('chat', 'image')),
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_user_kind_day
  on public.ai_usage (user_id, kind, created_at desc);
create index if not exists idx_ai_usage_user_hour
  on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

-- ── Verificação atómica de quota + registo de consumo ──────────────────────
-- Chamada exclusivamente pela edge function com service_role.
-- Devolve o id da linha criada (para atualizar os tokens reais depois).

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_kind text,
  p_chat_limit integer,
  p_image_limit integer,
  p_hourly_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used_hour integer;
  v_used_chat integer;
  v_used_image integer;
  v_limit integer;
  v_new_row uuid;
begin
  -- Anti-burst: máx. pedidos/hora em qualquer tipo
  select count(*) into v_used_hour
  from public.ai_usage
  where user_id = p_user_id
    and created_at > now() - interval '1 hour';

  if v_used_hour >= p_hourly_limit then
    return jsonb_build_object('allowed', false, 'reason', 'burst');
  end if;

  -- Consumo do dia (reset à meia-noite UTC)
  select
    count(*) filter (where kind = 'chat'),
    count(*) filter (where kind = 'image')
  into v_used_chat, v_used_image
  from public.ai_usage
  where user_id = p_user_id
    and created_at >= date_trunc('day', now() at time zone 'utc');

  v_limit := case when p_kind = 'chat' then p_chat_limit else p_image_limit end;

  if v_limit <= 0 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'plan',
      'remaining_chat', greatest(p_chat_limit - v_used_chat, 0),
      'remaining_image', greatest(p_image_limit - v_used_image, 0)
    );
  end if;

  if v_used_chat + (case when p_kind = 'chat' then 1 else 0 end) > p_chat_limit
     or v_used_image + (case when p_kind = 'image' then 1 else 0 end) > p_image_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily',
      'remaining_chat', greatest(p_chat_limit - v_used_chat, 0),
      'remaining_image', greatest(p_image_limit - v_used_image, 0)
    );
  end if;

  insert into public.ai_usage (user_id, kind)
  values (p_user_id, p_kind)
  returning id into v_new_row;

  return jsonb_build_object(
    'allowed', true,
    'usage_id', v_new_row,
    'remaining_chat', greatest(p_chat_limit - v_used_chat - (case when p_kind = 'chat' then 1 else 0 end), 0),
    'remaining_image', greatest(p_image_limit - v_used_image - (case when p_kind = 'image' then 1 else 0 end), 0)
  );
end;
$$;

revoke execute on function public.consume_ai_quota(uuid, text, integer, integer, integer)
  from public, anon, authenticated;
