-- Comunidade Fase 3 — push tokens + menções
-- Run this whole file once in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- 1. push_tokens (um token por utilizador; último registado vence)
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. message_mentions (quem é mencionado numa mensagem)
-- ---------------------------------------------------------------------------
create table if not exists public.message_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);
create index if not exists message_mentions_message_idx
  on public.message_mentions (message_id);

alter table public.message_mentions enable row level security;

drop policy if exists "mentions_select_auth" on public.message_mentions;
create policy "mentions_select_auth" on public.message_mentions
  for select to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_mentions.message_id
        and (
          m.channel_id is not null
          or exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = m.conversation_id
              and cm.user_id = auth.uid()
          )
        )
    )
  );
drop policy if exists "mentions_insert_own" on public.message_mentions;
create policy "mentions_insert_own" on public.message_mentions
  for insert to authenticated with check (
    exists (
      select 1 from public.messages m
      where m.id = message_mentions.message_id
        and m.user_id = auth.uid()
    )
  );
drop policy if exists "mentions_delete_own" on public.message_mentions;
create policy "mentions_delete_own" on public.message_mentions
  for delete to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_mentions.message_id
        and m.user_id = auth.uid()
    )
  );
