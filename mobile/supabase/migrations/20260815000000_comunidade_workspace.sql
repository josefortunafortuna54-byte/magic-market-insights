-- Comunidade Workspace Fase 1 — schema, RLS, triggers, seed, backfill
-- Run this whole file once in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- 1. user_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'online',
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. channels
-- ---------------------------------------------------------------------------
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text,
  icon text,
  type text not null default 'regular' check (type in ('regular', 'pair')),
  pair text,
  opened_at timestamptz,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists channels_type_pair_idx
  on public.channels (type, pair) where pair is not null;

-- ---------------------------------------------------------------------------
-- 3. conversations (DM 1:1)
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. conversation_members
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 5. messages (channel XOR conversation)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid,
  text text not null default '',
  image_url text,
  boom_id uuid,
  edited_at timestamptz,
  deleted_at timestamptz,
  client_msg_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint messages_target_check check (
    (channel_id is not null and conversation_id is null)
    or (channel_id is null and conversation_id is not null)
  )
);
create index if not exists messages_channel_idx
  on public.messages (channel_id, created_at)
  where deleted_at is null and conversation_id is null;
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at)
  where deleted_at is null and channel_id is null;
create index if not exists messages_boom_idx
  on public.messages (boom_id) where boom_id is not null;
create unique index if not exists messages_client_msg_id_idx
  on public.messages (client_msg_id);

-- ---------------------------------------------------------------------------
-- 6. message_reactions
-- ---------------------------------------------------------------------------
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.channels enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

drop policy if exists "channels_select_auth" on public.channels;
create policy "channels_select_auth" on public.channels
  for select to authenticated using (true);

drop policy if exists "profiles_select_auth" on public.user_profiles;
create policy "profiles_select_auth" on public.user_profiles
  for select to authenticated using (true);
drop policy if exists "profiles_insert_own" on public.user_profiles;
create policy "profiles_insert_own" on public.user_profiles
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own" on public.user_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "messages_select_channel" on public.messages;
create policy "messages_select_channel" on public.messages
  for select to authenticated using (channel_id is not null);
drop policy if exists "messages_select_dm" on public.messages;
create policy "messages_select_dm" on public.messages
  for select to authenticated using (
    conversation_id is not null
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );
drop policy if exists "messages_insert_channel" on public.messages;
create policy "messages_insert_channel" on public.messages
  for insert to authenticated with check (
    channel_id is not null
    and user_id = auth.uid()
    and not exists (
      select 1 from public.channels c
      where c.id = messages.channel_id
        and c.type = 'pair'
        and c.opened_at < now() - interval '24 hours'
    )
  );
drop policy if exists "messages_insert_dm" on public.messages;
create policy "messages_insert_dm" on public.messages
  for insert to authenticated with check (
    conversation_id is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations
  for select to authenticated using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id and cm.user_id = auth.uid()
    )
  );
drop policy if exists "conversations_insert_auth" on public.conversations;
create policy "conversations_insert_auth" on public.conversations
  for insert to authenticated with check (true);

drop policy if exists "cm_select_member" on public.conversation_members;
create policy "cm_select_member" on public.conversation_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = conversation_members.conversation_id
        and cm2.user_id = auth.uid()
    )
  );
drop policy if exists "cm_insert_auth" on public.conversation_members;
create policy "cm_insert_auth" on public.conversation_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = conversation_members.conversation_id
        and cm2.user_id = auth.uid()
    )
  );

drop policy if exists "reactions_select_auth" on public.message_reactions;
create policy "reactions_select_auth" on public.message_reactions
  for select to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
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
drop policy if exists "reactions_insert_own" on public.message_reactions;
create policy "reactions_insert_own" on public.message_reactions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reactions_delete_own" on public.message_reactions;
create policy "reactions_delete_own" on public.message_reactions
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 8. Functions + triggers
-- ---------------------------------------------------------------------------
create or replace function public.is_premium(uid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status = 'active'
  );
$$;

create or replace function public.upsert_pair_room(pair text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_channel_id uuid;
  v_slug text;
  v_bot_id uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_reopened boolean := false;
begin
  v_slug := 'pair-' || lower(regexp_replace(pair, '[^a-zA-Z0-9]', '', 'g'));

  select id into v_channel_id from public.channels where name = v_slug;

  if v_channel_id is null then
    insert into public.channels (name, display_name, type, pair, opened_at)
    values (v_slug, pair, 'pair', pair, now())
    returning id into v_channel_id;
    v_reopened := true;
  elsif v_channel_id is not null
        and exists (
          select 1 from public.channels c
          where c.id = v_channel_id and c.opened_at < now() - interval '24 hours'
        ) then
    update public.channels set opened_at = now() where id = v_channel_id;
    v_reopened := true;
  end if;

  if v_reopened then
    insert into public.messages (channel_id, user_id, text)
    values (v_channel_id, v_bot_id, '🤖 Sala aberta para ' || pair || ' — participa e partilha a tua análise.');
  end if;

  return v_channel_id;
end;
$$;

create or replace function public.trigger_upsert_pair_room_boom()
returns trigger language plpgsql security definer as $$
begin
  perform public.upsert_pair_room(new.pair);
  return new;
end;
$$;

create or replace function public.trigger_upsert_pair_room_signal()
returns trigger language plpgsql security definer as $$
begin
  perform public.upsert_pair_room(new.symbol);
  return new;
end;
$$;

drop trigger if exists upsert_pair_room_on_boom on public.boom_times;
create trigger upsert_pair_room_on_boom
  after insert on public.boom_times
  for each row execute function public.trigger_upsert_pair_room_boom();

drop trigger if exists upsert_pair_room_on_signal on public.signals;
create trigger upsert_pair_room_on_signal
  after insert on public.signals
  for each row execute function public.trigger_upsert_pair_room_signal();

create or replace function public.trigger_limit_conversation_members()
returns trigger language plpgsql security definer as $$
begin
  if (select count(*) from public.conversation_members
      where conversation_id = new.conversation_id) >= 2 then
    raise exception 'conversation_members: maximo de 2 membros por conversa';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_conversation_members on public.conversation_members;
create trigger limit_conversation_members
  before insert on public.conversation_members
  for each row execute function public.trigger_limit_conversation_members();

-- ---------------------------------------------------------------------------
-- 9. Realtime publication
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.channels;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.user_profiles;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Storage bucket "community" (public reads, owner writes)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('community', 'community', true)
on conflict (id) do nothing;

drop policy if exists "community_read_public" on storage.objects;
create policy "community_read_public" on storage.objects
  for select using (bucket_id = 'community');
drop policy if exists "community_insert_owner" on storage.objects;
create policy "community_insert_owner" on storage.objects
  for insert with check (
    bucket_id = 'community'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "community_update_owner" on storage.objects;
create policy "community_update_owner" on storage.objects
  for update using (
    bucket_id = 'community'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "community_delete_owner" on storage.objects;
create policy "community_delete_owner" on storage.objects
  for delete using (
    bucket_id = 'community'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 11. Bot user ("TMT Bot")
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  'tmt-bot@tmt.local',
  crypt('tmt-bot-internal-2026', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "TMT Bot"}',
  'authenticated',
  now(), now()
) on conflict (id) do nothing;

insert into public.user_profiles (user_id, display_name, role)
values ('11111111-1111-1111-1111-111111111111', 'TMT Bot', 'admin')
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 12. Seed channels
-- ---------------------------------------------------------------------------
insert into public.channels (name, display_name, description, icon, type) values
  ('geral',      'Geral',      'Conversa geral da comunidade',           '💬', 'regular'),
  ('sinais',     'Sinais',     'Booms e sinais em tempo real',           '🎯', 'regular'),
  ('duvidas',    'Dúvidas',    'Tira as tuas dúvidas',                   '❓', 'regular'),
  ('resultados', 'Resultados', 'Resultados e estatísticas',              '📈', 'regular'),
  ('off-topic',  'Off-Topic',  'Conversa livre e descontraída',          '🕹️', 'regular')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 13. Backfill user_profiles from auth.users
-- ---------------------------------------------------------------------------
insert into public.user_profiles (user_id, display_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(u.email, 'trader@tmt.local'), '@', 1)
  )
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 14. Backfill booms into #sinais (idempotent via client_msg_id = boom id)
-- ---------------------------------------------------------------------------
insert into public.messages (channel_id, user_id, text, boom_id, client_msg_id)
select
  c.id,
  '11111111-1111-1111-1111-111111111111',
  '🎯 ' || b.pair || ' — Boom',
  b.id,
  b.id
from public.boom_times b
cross join lateral (select id from public.channels where name = 'sinais') c
on conflict (client_msg_id) do nothing;
