-- Comunidade Fase 2 — pesquisa global de mensagens
-- Run this whole file once in the Supabase SQL editor.

create extension if not exists pg_trgm;

create index if not exists messages_text_trgm_idx
  on public.messages using gin (text gin_trgm_ops);

create or replace function public.search_messages(q text)
returns table (
  id uuid,
  channel_id uuid,
  conversation_id uuid,
  user_id uuid,
  text text,
  image_url text,
  boom_id uuid,
  edited_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    m.id, m.channel_id, m.conversation_id, m.user_id,
    m.text, m.image_url, m.boom_id, m.edited_at, m.created_at
  from public.messages m
  where m.deleted_at is null
    and m.text ilike '%' || q || '%'
    and (
      m.channel_id is not null
      or exists (
        select 1 from public.conversation_members cm
        where cm.conversation_id = m.conversation_id
          and cm.user_id = auth.uid()
      )
    )
  order by m.created_at desc
  limit 50;
$$;
