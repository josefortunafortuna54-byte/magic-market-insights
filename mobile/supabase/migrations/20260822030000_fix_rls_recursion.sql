-- Corrige o erro "infinite recursion detected in policy for relation conversation_members".
-- Run this whole file once in the Supabase SQL editor.
--
-- Causa: políticas RLS consultavam public.conversation_members dentro da avaliação
-- das próprias políticas dessa tabela (cm_select_member / cm_insert_auth) e de outras
-- tabelas (conversations, messages, message_reactions, message_mentions), provocando
-- recursão infinita no avaliador de políticas do Postgres.
--
-- Correção: função SECURITY DEFINER is_conversation_member(conv_id) — corre como
-- owner da tabela e ignora RLS — usada por todas as políticas de adesão.

create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conv_id
      and cm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

-- conversation_members -------------------------------------------------------
drop policy if exists "cm_select_member" on public.conversation_members;
create policy "cm_select_member" on public.conversation_members
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
  );

drop policy if exists "cm_insert_auth" on public.conversation_members;
create policy "cm_insert_auth" on public.conversation_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
  );

-- conversations ----------------------------------------------------------------
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations
  for select to authenticated using (
    public.is_conversation_member(id)
  );

-- messages ----------------------------------------------------------------------
drop policy if exists "messages_select_dm" on public.messages;
create policy "messages_select_dm" on public.messages
  for select to authenticated using (
    conversation_id is not null
    and public.is_conversation_member(conversation_id)
  );

drop policy if exists "messages_insert_dm" on public.messages;
create policy "messages_insert_dm" on public.messages
  for insert to authenticated with check (
    conversation_id is not null
    and user_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- message_reactions ---------------------------------------------------------------
drop policy if exists "reactions_select_auth" on public.message_reactions;
create policy "reactions_select_auth" on public.message_reactions
  for select to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (
          m.channel_id is not null
          or public.is_conversation_member(m.conversation_id)
        )
    )
  );

-- message_mentions ------------------------------------------------------------------
drop policy if exists "mentions_select_auth" on public.message_mentions;
create policy "mentions_select_auth" on public.message_mentions
  for select to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_mentions.message_id
        and (
          m.channel_id is not null
          or public.is_conversation_member(m.conversation_id)
        )
    )
  );
