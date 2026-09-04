# Comunidade Workspace Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Review

- **Status:** PASS
- **Reviewer:** superpawers-reviewer
- **Date:** 2026-08-15

**Goal:** Transform the Comunidade tab into a Slack-style workspace (Fase 1) per the approved spec `2026-08-15-comunidade-workspace-fase1-design.md`: public channels, text+image messages, emoji reactions, 1:1 DMs, bot-created pair rooms (24h lifecycle), and boom messages reusing `BoomCard` in `#sinais` — all backed by a Supabase migration, keeping the existing boom feed behind a `Feed | Workspace` segmented control.

**Architecture:** A single SQL migration adds `channels`, `messages`, `message_reactions`, `conversations`, `conversation_members`, `user_profiles` with RLS + a `upsert_pair_room` SECURITY DEFINER bot function triggered on `signals`/`boom_times` insert. On mobile, `comunidade.tsx` becomes a folder route with a nested Stack (`index`, `canais/[channelId]`, `dm/[conversationId]`, `novo-dm`). Data flows through new hooks (`useChannels`, `useConversations`, `useMessages`, `useProfiles`) following the existing `useBoomSocial` pattern (realtime `subscribeToChanges` + 15s poll), with optimistic send + `client_msg_id` dedupe. Reuses `BoomCard` for boom messages in `#sinais`.

**Tech Stack:** Expo SDK 56 / RN 0.85 / expo-router 56 (typed routes), @supabase/supabase-js 2, @tanstack/react-query (installed; community hooks follow the non-query `useBoomSocial` pattern), i18next + pt.json (single complete locale; stubs fall back to pt), expo-image-picker (NEW, for image messages), expo-crypto (installed, for `client_msg_id`).

**Conventions / constraints (READ FIRST):**
- Repo baseline: `npx tsc --noEmit` must pass with 0 errors and `npx expo lint` with 0 errors. There is **no unit test runner** in this repo (no jest); "test" = type-driven: components reference i18n keys/types that only typecheck once the key/type exists, plus lint and code review. SQL is verified by review; it must be applied to the Supabase project (SQL editor) before E2E.
- AGENTS.md mandates reading the versioned Expo v56 docs (https://docs.expo.dev/versions/v56.0.0/) before writing code — specifically for `expo-image-picker` (use `mediaTypes: ['images']`, not the deprecated `MediaTypeOptions`) and `expo-crypto` (`randomUUID()`).
- i18n: keys are typechecked against `pt.json` only (see `src/lib/i18n/i18next.d.ts`). The 13 other locale files are 40-byte stubs that fall back to `pt` — **do not touch them**. Keep all new strings in `pt.json`. Preserve UTF-8 encoding (accented Portuguese).
- Design system: import from `@/components/ui` (AppText, AppButton, Badge, Card, Chip, EmptyState, Screen, SectionTitle, Spinner) and `Colors`/`Spacing` from `@/core/theme`. Theme is dark (`bg #0A0A14`, primary `#16A43A`, accent `#FFC915`, destructive `#EF4444`).
- Navigation: imperative `router.push('/...')`; dynamic routes via template literal cast `as Href` (import `Href` from `expo-router`). Typed routes file `.expo/types/router.d.ts` is generated — after creating route files, regenerate with `npx expo customize tsconfig.json` (this runs typegen without a dev server) **before** running tsc.
- Realtime: always go through `subscribeToChanges(name, listeners)` from `@/lib/realtime` (supports `{ table, filter?, onEvent }`).
- The Supabase project already has (remote, no migrations in repo): `signals`, `boom_times`, `boom_comments`, `boom_votes`, `boom_hours`, `subscriptions`, `posts`, storage bucket `comments-audio`, RPC `get_users_count`. The new migration references `signals`, `boom_times`, `subscriptions`, and `auth.users` — they exist remotely; do not recreate them.
- Commits: follow repo style — `feat(comunidade): ...`, `feat(db): ...`, `feat(types): ...`. Commit at the end of every task.

**Scope notes (deviations from the older 2026-08-12 plan, decided in the 2026-08-15 spec):**
- NO unread badges (no `reads`/notification table in Fase 1 data model) → `useChannels` returns regular channels + pair rooms with computed state only.
- NO threads, presence, @menções, search, pins, PRO channels, notifications in Fase 1.
- Pair rooms are `channels` with `type='pair'` (not a separate table). `useChannels` exposes `regular` and `pairRooms` from the same fetch; a separate `usePairRooms` hook is NOT created (single-source, DRY).
- The bot user (`TMT Bot`) is created as a real `auth.users` row with a fixed UUID so `messages.user_id` FK/RLS holds.

---

## Task 1: Database migration — schema, RLS, triggers, seed, backfill

**Files:**
- Create: `supabase/migrations/20260815000000_comunidade_workspace.sql`

- [ ] **Step 1: Create the migration file** with EXACTLY this content:

```sql
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
```

- [ ] **Step 2: Review the SQL against the spec §3** (data model, RLS matrix §3.4, realtime §3.5, storage §3.6, functions §3.3). Check specifically:
  - RLS: a non-member cannot SELECT a DM's messages; a member can; a closed pair room blocks INSERT (`opened_at < now() - interval '24 hours'`).
  - The `conversation_members` insert policy relies on inserting the creator's own row FIRST, then the other member (the app must insert in that order — enforced in Task 3's `findOrCreateConversation`). Do not "fix" this by removing the check.
  - The `upsert_pair_room` only writes the bot welcome when the room is created or reopened.
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260815000000_comunidade_workspace.sql
git commit -m "feat(db): schema comunidade workspace fase 1 (canais, mensagens, reacções, DMs, salas de pares)"
```

> **Note for execution:** the migration is NOT applied to the remote Supabase project by this plan (no CLI credentials). It must be run once in the Supabase dashboard SQL editor. This is tracked as a final manual step in Task 6.

---

## Task 2: Dependencies, types, core helpers, i18n keys

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `app.json` (iOS photo-library permission + image-picker plugin)
- Modify: `src/core/types.ts`
- Modify: `src/core/format.ts`
- Create: `src/core/community.ts`
- Modify: `src/lib/i18n/locales/pt.json`

- [ ] **Step 1: Install `expo-image-picker`** (SDK-56 pinned by expo)

Run: `npx expo install expo-image-picker`
Expected: adds `expo-image-picker` (SDK 56 compatible) to `dependencies` and the `expo-image-picker` config plugin to the Expo config on next run.
Verify: `npm ls expo-image-picker` shows it installed. (Consult https://docs.expo.dev/versions/v56.0.0/sdk/imagepicker/ per AGENTS.md.)

- [ ] **Step 2: Update `app.json`** — add the photo-library permission and the image-picker plugin:

In the `"ios": { "infoPlist": { ... } }` object (currently only `NSMicrophoneUsageDescription`), add:
```json
"NSPhotoLibraryUsageDescription": "Permite anexar imagens nas mensagens da Comunidade."
```
In the `"plugins"` array, append after the `"expo-localization"` entry:
```json
[
  "expo-image-picker",
  {
    "photosPermission": "Permite anexar imagens nas mensagens da Comunidade."
  }
]
```
Verify: `npx tsc --noEmit` still passes (app.json is not typechecked, but confirm nothing broke). Also run `npx expo config --type public > $null` (or `npx expo config --type public`) to confirm the config parses.

- [ ] **Step 3: Add community types to `src/core/types.ts`** — append at the end of the file (after `BancaConfig`):

```ts
export type ChannelType = 'regular' | 'pair';
export type PairRoomState = 'active' | 'closed';

export interface Channel {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  type: ChannelType;
  pair: string | null;
  opened_at: string | null;
  is_premium: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string | null;
  conversation_id: string | null;
  user_id: string;
  parent_id: string | null;
  text: string;
  image_url: string | null;
  boom_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  client_msg_id: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
}
```

- [ ] **Step 4: Add `formatChatDate` to `src/core/format.ts`** — append after `formatShortDate` (it reuses existing `formatLongDate` and the `i18n` singleton already imported at the top of the file):

```ts
export function formatChatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return i18n.t('format.today');
  if (sameDay(d, yesterday)) return i18n.t('format.yesterday');
  return formatLongDate(dateStr);
}
```

- [ ] **Step 5: Create `src/core/community.ts`** (pure helpers — no supabase imports):

```ts
import type { Channel, Message } from '@/core/types';

export const BOT_USER_ID = '11111111-1111-1111-1111-111111111111';

export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '🚀', '🎯'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

const PAIR_ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function pairRoomState(channel: Channel): 'active' | 'closed' {
  if (channel.type !== 'pair' || !channel.opened_at) return 'closed';
  return Date.now() - new Date(channel.opened_at).getTime() < PAIR_ROOM_LIFETIME_MS
    ? 'active'
    : 'closed';
}

export function pairRoomClosesInMs(channel: Channel): number {
  if (!channel.opened_at) return 0;
  const closesAt = new Date(channel.opened_at).getTime() + PAIR_ROOM_LIFETIME_MS;
  return Math.max(0, closesAt - Date.now());
}

export function formatClosesIn(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}min`;
}

export function mergeMessages(current: Message[], server: Message[]): Message[] {
  const serverIds = new Set(server.map((m) => m.id));
  const serverClientIds = new Set(server.map((m) => m.client_msg_id));
  const inFlight = current.filter(
    (m) =>
      (m.pending || m.failed) &&
      !serverIds.has(m.id) &&
      !serverClientIds.has(m.client_msg_id),
  );
  return [...server, ...inFlight].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}
```

- [ ] **Step 6: Add i18n keys to `src/lib/i18n/locales/pt.json`** (UTF-8 — keep accents). Do NOT touch the 13 stub locale files.

(a) In the `"format"` section, add `"today"` and `"yesterday"` right after `"now"`:
```json
    "now": "agora mesmo",
    "today": "Hoje",
    "yesterday": "Ontem",
```

(b) Insert a new top-level `"workspace"` section immediately after the `"comunidade"` section (the section that ends with `"errorTitle": "Erro"`), so it reads:
```json
  "comunidade": {
    "all": "Todos",
    "live": "Ao Vivo",
    "upcoming": "Próximos",
    "closed": "Encerrados",
    "liveBadge": "AO VIVO",
    "title": "Boom Times",
    "loading": "A carregar comunidade…",
    "emptyTitle": "Sem booms",
    "emptyBody": "Ainda não há booms para mostrar.",
    "errorTitle": "Erro"
  },
  "workspace": {
    "feed": "Feed",
    "segmented": "Workspace",
    "title": "The Magic Trader Community",
    "channels": "Canais",
    "pairRooms": "Salas de Pares",
    "dms": "Mensagens Diretas",
    "newDm": "Nova DM",
    "closesIn": "Fecha em {{time}}",
    "closed": "Só leitura",
    "closedNote": "Sala encerrada — reabre quando {{pair}} tiver nova atividade.",
    "emptyChannels": "Sem canais disponíveis.",
    "emptyPairRooms": "Sem salas de pares ativas.",
    "emptyDms": "Sem conversas ainda. Inicia uma nova DM!",
    "noMessages": "Sem mensagens ainda. Começa a conversa!",
    "loadOlder": "Carregar mensagens mais antigas",
    "composerPlaceholder": "Escreve uma mensagem…",
    "uploadingImage": "A enviar imagem…",
    "react": "Reagir",
    "deleteMessage": "Apagar mensagem",
    "deleteTitle": "Apagar mensagem?",
    "deleteBody": "Esta ação não pode ser anulada.",
    "deleted": "Mensagem apagada",
    "failed": "Não enviada",
    "retry": "Tocar para tentar de novo",
    "selectUser": "Nova mensagem",
    "noProfiles": "Sem utilizadores disponíveis.",
    "bot": "BOT",
    "loading": "A carregar…",
    "errorTitle": "Erro"
  },
```

- [ ] **Step 7: Verify type-driven test for the new helpers/keys**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors). If the `i18next.d.ts` augmentation picks up the new keys, `formatChatDate`'s `i18n.t('format.today')` typechecks. `mergeMessages`, `pairRoomState`, `formatClosesIn`, `REACTION_EMOJIS`, `BOT_USER_ID` are exported and unused so far — tsc passes with noUnusedLocals only for locals, not exports.

Run: `npx expo lint`
Expected: 0 errors (3 pre-existing warnings in `planos.tsx` and `i18n/index.ts` are acceptable and must remain).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json app.json src/core/types.ts src/core/format.ts src/core/community.ts src/lib/i18n/locales/pt.json
git commit -m "feat(types): tipos de comunidade, helpers e i18n do workspace"
```

---

## Task 3: Hooks and Supabase helpers

**Files:**
- Create: `src/lib/community.ts`
- Create: `src/hooks/useProfiles.ts`
- Create: `src/hooks/useChannels.ts`
- Create: `src/hooks/useConversations.ts`
- Create: `src/hooks/useMessages.ts`
- Create: `src/hooks/useBoom.ts`

- [ ] **Step 1: Create `src/lib/community.ts`** (Supabase-backed helpers):

```ts
import { supabase } from '@/lib/supabase';

export async function findOrCreateConversation(
  userId: string,
  otherId: string,
): Promise<string> {
  const { data: mine } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);

  const ids = (mine || []).map((r) => r.conversation_id);

  if (ids.length > 0) {
    const { data: theirs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherId)
      .in('conversation_id', ids);
    const existing = (theirs || [])[0]?.conversation_id;
    if (existing) return existing;
  }

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({})
    .select('id')
    .single();
  if (error || !conv) throw new Error('Falha ao criar a conversa.');

  await supabase
    .from('conversation_members')
    .insert({ conversation_id: conv.id, user_id: userId });
  await supabase
    .from('conversation_members')
    .insert({ conversation_id: conv.id, user_id: otherId });

  return conv.id;
}

export async function uploadCommunityImage(
  userId: string,
  uri: string,
  mimeType: string,
): Promise<string | null> {
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
  const name = `img-${Date.now()}.${ext}`;
  const path = `community/${userId}/${name}`;
  const form = new FormData();
  form.append('file', { uri, name, type: mimeType } as any);
  const { error } = await supabase.storage
    .from('community')
    .upload(path, form as any, { contentType: mimeType, upsert: false });
  if (error) return null;
  return supabase.storage.from('community').getPublicUrl(path).data.publicUrl;
}
```

> **Why two sequential `conversation_members` inserts?** The RLS policy `cm_insert_auth` allows inserting the *other* member only if the caller is already a member of that conversation. Within a single multi-row INSERT, the self row is not visible to the policy subquery, so the other row would be rejected. Two sequential statements guarantee the self row exists first.

- [ ] **Step 2: Create `src/hooks/useProfiles.ts`**:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { UserProfile } from '@/core/types';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.from('user_profiles').select('*');
      const map: Record<string, UserProfile> = {};
      for (const p of (data || []) as UserProfile[]) map[p.user_id] = p;
      setProfiles(map);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const cleanup = subscribeToChanges('community-profiles', [
      { table: 'user_profiles', onEvent: () => refresh() },
    ]);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [refresh]);

  return { profiles, loading, refresh };
}
```

- [ ] **Step 3: Create `src/hooks/useChannels.ts`**:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { Channel } from '@/core/types';

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });
      if (err) throw err;
      setChannels((data || []) as Channel[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar canais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const cleanup = subscribeToChanges('community-channels', [
      { table: 'channels', onEvent: () => refresh() },
    ]);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [refresh]);

  const regular = channels.filter((c) => c.type === 'regular');
  const pairRooms = channels.filter((c) => c.type === 'pair');

  return { channels, regular, pairRooms, loading, error, refresh };
}
```

- [ ] **Step 4: Create `src/hooks/useConversations.ts`**:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation, ConversationMember } from '@/core/types';

export interface DmSummary {
  conversationId: string;
  memberId: string;
  createdAt: string;
}

export function useConversations() {
  const { user } = useAuth();
  const [dms, setDms] = useState<DmSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setDms([]);
      setLoading(false);
      return;
    }
    try {
      const { data: my } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id')
        .eq('user_id', user.id);
      const rows = (my || []) as ConversationMember[];
      if (rows.length === 0) {
        setDms([]);
        return;
      }
      const ids = rows.map((r) => r.conversation_id);

      const [{ data: members }, { data: convs }] = await Promise.all([
        supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', ids),
        supabase
          .from('conversations')
          .select('id, created_at')
          .in('id', ids),
      ]);

      const all = (members || []) as ConversationMember[];
      const convMap = new Map(
        ((convs || []) as Conversation[]).map((c) => [c.id, c.created_at]),
      );
      const seen = new Set<string>();

      const list: DmSummary[] = [];
      for (const row of all) {
        if (row.user_id === user.id || seen.has(row.conversation_id)) continue;
        seen.add(row.conversation_id);
        list.push({
          conversationId: row.conversation_id,
          memberId: row.user_id,
          createdAt: convMap.get(row.conversation_id) || '',
        });
      }
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setDms(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const cleanup = subscribeToChanges('community-conversations', [
      { table: 'conversation_members', onEvent: () => refresh() },
    ]);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [refresh]);

  return { dms, loading, refresh };
}
```

- [ ] **Step 5: Create `src/hooks/useBoom.ts`**:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BoomTime } from '@/core/types';

export function useBoom(id: string) {
  const [boom, setBoom] = useState<BoomTime | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('boom_times')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setBoom((data as BoomTime | null) ?? null);
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { boom, refresh };
}
```

- [ ] **Step 6: Create `src/hooks/useMessages.ts`** (the core chat hook — optimistic send with `client_msg_id` dedupe):

```ts
import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { mergeMessages } from '@/core/community';
import { useAuth } from '@/hooks/useAuth';
import type { Message, MessageReaction } from '@/core/types';

const PAGE_SIZE = 100;

export type MessagesTarget = { channelId: string } | { conversationId: string };

export function useMessages(target: MessagesTarget) {
  const { user } = useAuth();
  const channelId = 'channelId' in target ? target.channelId : undefined;
  const conversationId = 'conversationId' in target ? target.conversationId : undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  useEffect(() => {
    setMessages([]);
    setReactions([]);
    setHasOlder(false);
    setLoading(true);
    setError(null);
  }, [channelId, conversationId]);

  const query = useCallback(() => {
    let q = supabase.from('messages').select('*').is('deleted_at', null);
    if (channelId) q = q.eq('channel_id', channelId);
    else if (conversationId) q = q.eq('conversation_id', conversationId);
    return q;
  }, [channelId, conversationId]);

  const loadReactions = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setReactions([]);
      return;
    }
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', ids);
    setReactions((data || []) as MessageReaction[]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data, error: err } = await query()
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (err) throw err;
      const rows = ((data as Message[] | null) || []).reverse();
      setMessages((prev) => mergeMessages(prev, rows));
      await loadReactions(rows.map((m) => m.id));
      setHasOlder((data || []).length === PAGE_SIZE);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  }, [query, loadReactions]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const { data } = await query()
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      const rows = ((data as Message[] | null) || []).reverse();
      setMessages((prev) => [...rows, ...prev]);
      await loadReactions(rows.map((m) => m.id));
      setHasOlder((data || []).length === PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  }, [query, loadReactions, loadingOlder, messages]);

  const send = useCallback(
    async (text: string, imageUrl?: string | null) => {
      if (!user) return;
      const clientId = Crypto.randomUUID();
      const optimistic: Message = {
        id: clientId,
        channel_id: channelId ?? null,
        conversation_id: conversationId ?? null,
        user_id: user.id,
        parent_id: null,
        text,
        image_url: imageUrl ?? null,
        boom_id: null,
        edited_at: null,
        deleted_at: null,
        client_msg_id: clientId,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { error } = await supabase.from('messages').insert({
        channel_id: channelId ?? null,
        conversation_id: conversationId ?? null,
        user_id: user.id,
        text,
        image_url: imageUrl ?? null,
        client_msg_id: clientId,
      });

      if (error && error.code !== '23505') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === clientId ? { ...m, pending: false, failed: true } : m,
          ),
        );
      }
    },
    [channelId, conversationId, user],
  );

  const retry = useCallback(async (message: Message) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id ? { ...m, failed: false, pending: true } : m,
      ),
    );
    const { error } = await supabase.from('messages').insert({
      channel_id: message.channel_id,
      conversation_id: message.conversation_id,
      user_id: message.user_id,
      text: message.text,
      image_url: message.image_url,
      client_msg_id: message.client_msg_id,
    });
    if (error && error.code !== '23505') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, pending: false, failed: true } : m,
        ),
      );
    }
  }, []);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      const existing = reactions.find(
        (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
      );
      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji });
      }
      await loadReactions(messages.map((m) => m.id));
    },
    [user, reactions, messages, loadReactions],
  );

  const softDelete = useCallback(async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const listeners: { table: string; filter?: string; onEvent: () => void }[] = [];
    if (channelId) {
      listeners.push({
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
        onEvent: () => refresh(),
      });
    }
    if (conversationId) {
      listeners.push({
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
        onEvent: () => refresh(),
      });
    }
    listeners.push({ table: 'message_reactions', onEvent: () => refresh() });

    const cleanup = subscribeToChanges(
      `community-msgs-${channelId ?? conversationId}`,
      listeners,
    );
    const poll = setInterval(refresh, 15_000);
    return () => {
      clearTimeout(timer);
      cleanup();
      clearInterval(poll);
    };
  }, [channelId, conversationId, refresh]);

  return {
    messages,
    reactions,
    loading,
    error,
    hasOlder,
    loadingOlder,
    refresh,
    loadOlder,
    send,
    retry,
    toggleReaction,
    softDelete,
  };
}
```

> **23505 note:** a retry can race a successful first insert (same `client_msg_id`, which has a UNIQUE index). `error.code === '23505'` (unique_violation) is treated as "already delivered" — the pending row stays until the next realtime/poll refresh replaces it with the server row.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors). This confirms the hooks typecheck against the new types and `@/lib/realtime`'s listener shape (it accepts `{ table, filter?, onEvent }` — verify the `listeners` array literal matches `ChangesListener`; if the optional `filter` on a non-optional-matching object causes an error, type the array explicitly as the exported shape).

Run: `npx expo lint`
Expected: 0 errors (3 pre-existing warnings remain).

- [ ] **Step 8: Commit**

```bash
git add src/lib/community.ts src/hooks/useProfiles.ts src/hooks/useChannels.ts src/hooks/useConversations.ts src/hooks/useMessages.ts src/hooks/useBoom.ts
git commit -m "feat(hooks): hooks e helpers do workspace comunidade"
```

---

## Task 4: Workspace components

**Files (all under `src/components/community/`):**
- Create: `src/components/community/WorkspaceSection.tsx`
- Create: `src/components/community/ChannelRow.tsx`
- Create: `src/components/community/PairRoomRow.tsx`
- Create: `src/components/community/DmRow.tsx`
- Create: `src/components/community/MessageBubble.tsx`
- Create: `src/components/community/MessageList.tsx`
- Create: `src/components/community/Composer.tsx`
- Create: `src/components/community/BoomMessage.tsx`
- Create: `src/components/community/CommunityFeed.tsx`

- [ ] **Step 1: Create `WorkspaceSection.tsx`**:

```tsx
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

export function WorkspaceSection({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="label" style={styles.title}>{title}</AppText>
        {right}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.textFaint, letterSpacing: 1.2 },
  body: { gap: Spacing.sm },
});
```

- [ ] **Step 2: Create `ChannelRow.tsx`**:

```tsx
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import type { Channel } from '@/core/types';

export function ChannelRow({ channel, onPress }: { channel: Channel; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons name="hash" size={16} color={Colors.textMuted} />
      <AppText style={styles.label}>{channel.display_name}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
    borderRadius: 8,
  },
  label: { color: Colors.text, fontWeight: '600' },
});
```

- [ ] **Step 3: Create `PairRoomRow.tsx`** (live countdown, closed = read-only):

```tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import {
  formatClosesIn,
  pairRoomClosesInMs,
  pairRoomState,
} from '@/core/community';
import { Colors, Spacing } from '@/core/theme';
import type { Channel } from '@/core/types';

export function PairRoomRow({ channel, onPress }: { channel: Channel; onPress: () => void }) {
  const { t } = useTranslation();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const active = pairRoomState(channel) === 'active';
  const closesIn = formatClosesIn(pairRoomClosesInMs(channel));

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <AppText style={styles.bot}>🤖</AppText>
      <View style={styles.info}>
        <AppText style={styles.pair}>{channel.pair || channel.display_name}</AppText>
        <AppText variant="small" style={{ color: Colors.textMuted }}>
          {active ? `#${channel.name}` : t('workspace.closed')}
        </AppText>
      </View>
      <AppText
        variant="small"
        style={{ color: active ? Colors.primary : Colors.textFaint, fontWeight: '700' }}
      >
        {active ? t('workspace.closesIn', { time: closesIn }) : '🔒'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
  },
  bot: { fontSize: 16 },
  info: { flex: 1, gap: 2 },
  pair: { fontWeight: '700' },
});
```

- [ ] **Step 4: Create `DmRow.tsx`**:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import type { UserProfile } from '@/core/types';
import type { DmSummary } from '@/hooks/useConversations';

export function DmRow({
  dm,
  profiles,
  onPress,
}: {
  dm: DmSummary;
  profiles: Record<string, UserProfile>;
  onPress: () => void;
}) {
  const name = profiles[dm.memberId]?.display_name || 'Trader';
  const letter = (name || 'T')[0].toUpperCase();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: `${Colors.primary}2E` }]}>
        <AppText variant="small" style={{ color: Colors.primary, fontWeight: '800' }}>
          {letter}
        </AppText>
      </View>
      <AppText style={{ fontWeight: '600' }}>{name}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 5: Create `MessageBubble.tsx`** (reactions as toggle chips + "+" emoji picker, long-press delete own, failed retry):

```tsx
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, Badge } from '@/components/ui';
import { REACTION_EMOJIS } from '@/core/community';
import { timeAgo } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import type { Message, MessageReaction, UserProfile } from '@/core/types';

export function MessageBubble({
  message,
  reactions,
  profile,
  currentUserId,
  onToggleReaction,
  onRetry,
  onDelete,
}: {
  message: Message;
  reactions: MessageReaction[];
  profile?: UserProfile;
  currentUserId: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
}) {
  const { t } = useTranslation();
  const isOwn = message.user_id === currentUserId;
  const name = profile?.display_name || t('common.trader');
  const avatarColor = profile?.role === 'admin' ? Colors.accent : Colors.primary;

  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = grouped.get(r.emoji) || { count: 0, mine: false };
    g.count += 1;
    if (r.user_id === currentUserId) g.mine = true;
    grouped.set(r.emoji, g);
  }

  const onLongPress = () => {
    if (!isOwn) return;
    Alert.alert(
      t('workspace.deleteTitle'),
      t('workspace.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('workspace.deleteMessage'), style: 'destructive', onPress: () => onDelete(message) },
      ],
    );
  };

  const onAddReaction = () => {
    Alert.alert(
      t('workspace.react'),
      undefined,
      [
        ...REACTION_EMOJIS.map((emoji) => ({
          text: emoji,
          onPress: () => onToggleReaction(message.id, emoji),
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {!isOwn ? (
        <View style={[styles.avatar, { backgroundColor: `${avatarColor}2E` }]}>
          <AppText variant="small" style={{ color: avatarColor, fontWeight: '800' }}>
            {(name || 'T')[0].toUpperCase()}
          </AppText>
        </View>
      ) : null}

      <Pressable onLongPress={onLongPress} style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        <View style={styles.meta}>
          {!isOwn ? (
            <AppText variant="small" style={styles.name}>{name}</AppText>
          ) : null}
          {profile?.role === 'admin' ? (
            <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>{t('workspace.bot')}</Badge>
          ) : null}
          <AppText variant="small" style={styles.time}>{timeAgo(message.created_at)}</AppText>
        </View>

        {message.image_url ? (
          <Image source={{ uri: message.image_url }} style={styles.image} resizeMode="cover" />
        ) : null}
        {message.text ? <AppText>{message.text}</AppText> : null}

        {message.failed ? (
          <Pressable onPress={() => onRetry(message)} style={styles.failedRow}>
            <Ionicons name="refresh" size={14} color={Colors.destructive} />
            <AppText variant="small" style={{ color: Colors.destructive, fontWeight: '600' }}>
              {t('workspace.failed')} — {t('workspace.retry')}
            </AppText>
          </Pressable>
        ) : message.pending ? (
          <AppText variant="small" style={{ color: Colors.textFaint }}>{t('workspace.loading')}</AppText>
        ) : null}

        <View style={styles.reactions}>
          {[...grouped.entries()].map(([emoji, g]) => (
            <Pressable
              key={emoji}
              onPress={() => onToggleReaction(message.id, emoji)}
              style={[styles.reactionChip, g.mine && styles.reactionMine]}
            >
              <AppText variant="small">{emoji} {g.count}</AppText>
            </Pressable>
          ))}
          <Pressable onPress={onAddReaction} style={styles.reactionAdd}>
            <Ionicons name="add" size={12} color={Colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  rowOwn: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    flexShrink: 1,
    maxWidth: '82%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  bubbleOwn: { backgroundColor: Colors.surface },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: { fontWeight: '700', flex: 1 },
  time: { color: Colors.textMuted },
  image: { width: 200, height: 140, borderRadius: Radius.sm },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, alignItems: 'center' },
  reactionChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: `${Colors.primary}1F`,
  },
  reactionMine: { backgroundColor: `${Colors.primary}4D` },
  reactionAdd: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

> Requires `Radius` in the import: change the `import { Colors, Spacing } from '@/core/theme';` line to `import { Colors, Radius, Spacing } from '@/core/theme';`.

- [ ] **Step 6: Create `MessageList.tsx`** (day grouping, load-older header, auto-scroll to bottom when near bottom):

```tsx
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, EmptyState } from '@/components/ui';
import { MessageBubble } from '@/components/community/MessageBubble';
import { BoomMessage } from '@/components/community/BoomMessage';
import { formatChatDate } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import type { Message, MessageReaction, UserProfile } from '@/core/types';

type ListItem =
  | { type: 'header'; key: string; date: string }
  | { type: 'message'; key: string; message: Message };

export function MessageList({
  messages,
  reactions,
  profiles,
  currentUserId,
  hasOlder,
  loadingOlder,
  error,
  onLoadOlder,
  onToggleReaction,
  onRetry,
  onDelete,
  onReload,
}: {
  messages: Message[];
  reactions: MessageReaction[];
  profiles: Record<string, UserProfile>;
  currentUserId: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  error?: string | null;
  onLoadOlder: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReload?: () => void;
}) {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<ListItem>>(null);
  const [nearBottom, setNearBottom] = useState(true);

  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    let lastDay = '';
    for (const m of messages) {
      const day = formatChatDate(m.created_at);
      if (day !== lastDay) {
        out.push({ type: 'header', key: `h-${day}`, date: day });
        lastDay = day;
      }
      out.push({ type: 'message', key: `m-${m.id}`, message: m });
    }
    return out;
  }, [messages]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setNearBottom(
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 80,
    );
  };

  const scrollToEnd = () => listRef.current?.scrollToEnd({ animated: true });

  const renderItem: ListRenderItem<ListItem> = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dayHeader}>
          <AppText variant="small" style={styles.dayText}>{item.date}</AppText>
        </View>
      );
    }
    const m = item.message;
    if (m.boom_id) return <BoomMessage message={m} />;
    return (
      <MessageBubble
        message={m}
        reactions={reactions.filter((r) => r.message_id === m.id)}
        profile={profiles[m.user_id]}
        currentUserId={currentUserId}
        onToggleReaction={onToggleReaction}
        onRetry={onRetry}
        onDelete={onDelete}
      />
    );
  };

  if (messages.length === 0) {
    return (
      <View style={styles.empty}>
        {error ? (
          <>
            <EmptyState title={t('workspace.errorTitle')} subtitle={error} />
            {onReload ? (
              <Pressable onPress={onReload} style={styles.reload}>
                <AppText variant="small" style={styles.reloadText}>
                  {t('workspace.retry')}
                </AppText>
              </Pressable>
            ) : null}
          </>
        ) : (
          <EmptyState title={t('workspace.noMessages')} />
        )}
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      ListHeaderComponent={
        hasOlder ? (
          <Pressable onPress={onLoadOlder} style={styles.older} disabled={loadingOlder}>
            <Ionicons name="chevron-up" size={14} color={Colors.textMuted} />
            <AppText variant="small" style={{ color: Colors.textMuted, fontWeight: '600' }}>
              {loadingOlder ? t('workspace.loading') : t('workspace.loadOlder')}
            </AppText>
          </Pressable>
        ) : null
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        if (nearBottom) listRef.current?.scrollToEnd({ animated: false });
      }}
      onScrollToIndexFailed={() => {}}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center' },
  list: { paddingBottom: Spacing.md, gap: Spacing.md },
  dayHeader: { alignItems: 'center', paddingVertical: Spacing.sm },
  dayText: { color: Colors.textMuted, fontWeight: '700' },
  older: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  reload: {
    alignSelf: 'center',
    marginTop: Spacing.xs,
    backgroundColor: `${Colors.primary}1F`,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  reloadText: { color: Colors.primary, fontWeight: '700' },
});
```

- [ ] **Step 7: Create `Composer.tsx`** (text + image, uploads to `community` bucket):

```tsx
import { useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { uploadCommunityImage } from '@/lib/community';

export function Composer({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string, imageUrl?: string | null) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    setImage({
      uri: asset.uri,
      name: `img-${Date.now()}.${ext}`,
      type: asset.mimeType || `image/${ext}`,
    });
  };

  const send = async () => {
    if (!user || sending || uploading || disabled) return;
    if (!text.trim() && !image) return;
    setSending(true);
    let imageUrl: string | null = null;
    if (image) {
      setUploading(true);
      imageUrl = await uploadCommunityImage(user.id, image.uri, image.type);
      setUploading(false);
    }
    await onSend(text.trim(), imageUrl);
    setText('');
    setImage(null);
    setSending(false);
  };

  return (
    <View style={styles.composer}>
      {image ? (
        <View style={styles.attachRow}>
          <Image source={{ uri: image.uri }} style={styles.thumb} />
          <Pressable onPress={() => setImage(null)} style={styles.remove}>
            <Ionicons name="close" size={14} color={Colors.text} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        <Pressable onPress={pickImage} style={styles.iconBtn} disabled={uploading}>
          <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder || t('workspace.composerPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          multiline
          style={styles.input}
        />
        <AppButton
          title={t('common.send')}
          onPress={send}
          loading={sending || uploading}
          disabled={(!text.trim() && !image) || disabled}
          style={styles.sendBtn}
        />
      </View>
      {uploading ? (
        <AppText variant="small" style={{ color: Colors.textMuted }}>
          {t('workspace.uploadingImage')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { paddingTop: Spacing.sm, gap: Spacing.sm },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: Radius.sm },
  remove: {
    position: 'absolute',
    top: 4,
    left: 48,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  iconBtn: { paddingBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    minHeight: 42,
    maxHeight: 100,
  },
  sendBtn: { paddingVertical: 10, paddingHorizontal: 18 },
});
```

> Requires `Radius` too: change `import { Colors, Spacing } from '@/core/theme';` to `import { Colors, Radius, Spacing } from '@/core/theme';` in this file.

- [ ] **Step 8: Create `BoomMessage.tsx`** (reuses `BoomCard` + `useBoomSocial` inside `#sinais`):

```tsx
import { AppText } from '@/components/ui';
import { BoomCard } from '@/components/BoomCard';
import { useBoom } from '@/hooks/useBoom';
import { useBoomSocial } from '@/hooks/useBoomSocial';
import { useTranslation } from 'react-i18next';
import type { BoomTime, Message } from '@/core/types';

function BoomCardContainer({ boom }: { boom: BoomTime }) {
  const { comments, votes } = useBoomSocial(boom.id);
  return <BoomCard boom={boom} comments={comments} votes={votes} />;
}

export function BoomMessage({ message }: { message: Message }) {
  const { t } = useTranslation();
  const { boom } = useBoom(message.boom_id || '');
  if (!boom) {
    return <AppText variant="muted">{t('workspace.loading')}</AppText>;
  }
  return <BoomCardContainer boom={boom} />;
}
```

- [ ] **Step 9: Create `CommunityFeed.tsx`** — extract the existing feed from `(tabs)/comunidade.tsx` (same behaviour, no `Screen` wrapper — the parent screen owns the scroll container):

```tsx
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Chip, EmptyState, SectionTitle, Spinner } from '@/components/ui';
import { BoomCard } from '@/components/BoomCard';
import { useBooms } from '@/hooks/useBooms';
import { useBoomSocial } from '@/hooks/useBoomSocial';
import { getBoomStatus } from '@/core/booms';
import { Colors } from '@/core/theme';
import type { BoomTime } from '@/core/types';

type Filter = 'todos' | 'live' | 'upcoming' | 'expired';
type FilterLabel = 'comunidade.all' | 'comunidade.live' | 'comunidade.upcoming' | 'comunidade.closed';

const FILTERS: { key: Filter; label: FilterLabel }[] = [
  { key: 'todos', label: 'comunidade.all' },
  { key: 'live', label: 'comunidade.live' },
  { key: 'upcoming', label: 'comunidade.upcoming' },
  { key: 'expired', label: 'comunidade.closed' },
];

function LiveBadge() {
  const { t } = useTranslation();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Badge color={Colors.live} bg={`${Colors.live}1F`}>{t('comunidade.liveBadge')}</Badge>
    </Animated.View>
  );
}

function BoomCardContainer({ boom }: { boom: BoomTime }) {
  const { comments, votes } = useBoomSocial(boom.id);
  return <BoomCard boom={boom} comments={comments} votes={votes} />;
}

export function CommunityFeed() {
  const { t } = useTranslation();
  const { booms, loading, error } = useBooms();
  const [filter, setFilter] = useState<Filter>('todos');

  const liveCount = booms.filter((b) => getBoomStatus(b.boom_time) === 'live').length;

  const sorted = [...booms].sort(
    (a, b) => new Date(b.boom_time).getTime() - new Date(a.boom_time).getTime(),
  );

  const filtered = sorted.filter((b) => {
    const status = getBoomStatus(b.boom_time);
    if (filter === 'live') return status === 'live';
    if (filter === 'upcoming') return status === 'upcoming';
    if (filter === 'expired') return status === 'expired';
    return true;
  });

  return (
    <View style={styles.container}>
      <SectionTitle right={liveCount > 0 ? <LiveBadge /> : null}>{t('comunidade.title')}</SectionTitle>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={t(f.label)}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {loading ? (
        <Spinner label={t('comunidade.loading')} />
      ) : error ? (
        <EmptyState title={t('comunidade.errorTitle')} subtitle={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('comunidade.emptyTitle')} subtitle={t('comunidade.emptyBody')} />
      ) : (
        filtered.map((boom) => <BoomCardContainer key={boom.id} boom={boom} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
});
```

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors). Watch for: unused imports (`Radius` used in `MessageBubble`/`Composer` styles, `Message` import in `BoomMessage` used, `BoomCardContainer` name collisions none), and the `Image` from `react-native` (fine). If `expo-image-picker`'s `mediaTypes: ['images']` type differs on SDK 56 (e.g. expects `ImagePicker.MediaType[]`), fix to the documented v56 API.

Run: `npx expo lint`
Expected: 0 errors (3 pre-existing warnings remain).

- [ ] **Step 11: Commit**

```bash
git add src/components/community
git commit -m "feat(components): componentes do workspace comunidade"
```

---

## Task 5: Screens, routing and tab conversion

**Files:**
- Delete: `src/app/(tabs)/comunidade.tsx`
- Create: `src/app/(tabs)/comunidade/_layout.tsx`
- Create: `src/app/(tabs)/comunidade/index.tsx`
- Create: `src/app/(tabs)/comunidade/canais/[channelId].tsx`
- Create: `src/app/(tabs)/comunidade/dm/[conversationId].tsx`
- Create: `src/app/(tabs)/comunidade/novo-dm.tsx`
- Modify: `src/app/(tabs)/_layout.tsx` (comunidade tab: `headerShown: false`)

- [ ] **Step 1: Delete the old tab file**

Run: `git rm src/app/(tabs)/comunidade.tsx`
(Quoting: use `git rm "src/app/(tabs)/comunidade.tsx"` from PowerShell — parentheses must be quoted.)

- [ ] **Step 2: Create `src/app/(tabs)/comunidade/_layout.tsx`**:

```tsx
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/core/theme';

export default function ComunidadeLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="canais/[channelId]" options={{ title: t('workspace.channels') }} />
      <Stack.Screen name="dm/[conversationId]" options={{ title: '' }} />
      <Stack.Screen name="novo-dm" options={{ title: t('workspace.selectUser'), presentation: 'modal' }} />
    </Stack>
  );
}
```

- [ ] **Step 3: Create `src/app/(tabs)/comunidade/index.tsx`** (segmented Feed | Workspace):

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Chip, Screen, SectionTitle } from '@/components/ui';
import { ChannelRow } from '@/components/community/ChannelRow';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { DmRow } from '@/components/community/DmRow';
import { PairRoomRow } from '@/components/community/PairRoomRow';
import { WorkspaceSection } from '@/components/community/WorkspaceSection';
import { pairRoomState } from '@/core/community';
import { Colors, Spacing } from '@/core/theme';
import { useChannels } from '@/hooks/useChannels';
import { useConversations } from '@/hooks/useConversations';
import { useProfiles } from '@/hooks/useProfiles';

type Mode = 'feed' | 'workspace';

export default function ComunidadeIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('feed');
  const { regular, pairRooms, loading, error, refresh } = useChannels();
  const { dms, loading: loadingDms } = useConversations();
  const { profiles } = useProfiles();

  const activePairs = pairRooms.filter((c) => pairRoomState(c) === 'active');
  const closedPairs = pairRooms.filter((c) => pairRoomState(c) === 'closed');

  return (
    <Screen>
      <View style={styles.segment}>
        <Chip label={t('workspace.feed')} active={mode === 'feed'} onPress={() => setMode('feed')} />
        <Chip label={t('workspace.segmented')} active={mode === 'workspace'} onPress={() => setMode('workspace')} />
      </View>

      {mode === 'feed' ? (
        <CommunityFeed />
      ) : (
        <View style={styles.workspace}>
          <SectionTitle>{t('workspace.title')}</SectionTitle>

          {error ? (
            <Pressable onPress={refresh} style={styles.errorBanner}>
              <AppText variant="small" style={styles.errorText}>
                {t('workspace.errorTitle')} — {error}
              </AppText>
            </Pressable>
          ) : null}

          <WorkspaceSection title={t('workspace.channels')}>
            {regular.map((c) => (
              <ChannelRow
                key={c.id}
                channel={c}
                onPress={() => router.push(`/comunidade/canais/${c.id}` as Href)}
              />
            ))}
            {regular.length === 0 && !loading && (
              <AppText variant="muted">{t('workspace.emptyChannels')}</AppText>
            )}
          </WorkspaceSection>

          <WorkspaceSection title={t('workspace.pairRooms')}>
            {[...activePairs, ...closedPairs].map((c) => (
              <PairRoomRow
                key={c.id}
                channel={c}
                onPress={() => router.push(`/comunidade/canais/${c.id}` as Href)}
              />
            ))}
            {pairRooms.length === 0 && !loading && (
              <AppText variant="muted">{t('workspace.emptyPairRooms')}</AppText>
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title={t('workspace.dms')}
            right={
              <Pressable onPress={() => router.push('/comunidade/novo-dm' as Href)} style={styles.newDm}>
                <Ionicons name="add" size={16} color={Colors.primary} />
                <AppText variant="small" style={{ color: Colors.primary, fontWeight: '700' }}>
                  {t('workspace.newDm')}
                </AppText>
              </Pressable>
            }
          >
            {dms.map((dm) => (
              <DmRow
                key={dm.conversationId}
                dm={dm}
                profiles={profiles}
                onPress={() => router.push(`/comunidade/dm/${dm.conversationId}` as Href)}
              />
            ))}
            {dms.length === 0 && !loadingDms && (
              <AppText variant="muted">{t('workspace.emptyDms')}</AppText>
            )}
          </WorkspaceSection>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  workspace: { gap: Spacing.sm },
  newDm: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  errorBanner: {
    backgroundColor: `${Colors.destructive}1F`,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  errorText: { color: Colors.destructive, fontWeight: '600' },
});
```

- [ ] **Step 4: Create `src/app/(tabs)/comunidade/canais/[channelId].tsx`**:

```tsx
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Screen } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageList } from '@/components/community/MessageList';
import { pairRoomState } from '@/core/community';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useChannels } from '@/hooks/useChannels';
import { useMessages } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';

export default function ChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { channels } = useChannels();
  const { profiles } = useProfiles();

  const channel = channels.find((c) => c.id === channelId);
  const closed =
    channel ? channel.type === 'pair' && pairRoomState(channel) === 'closed' : false;

  const {
    messages,
    reactions,
    hasOlder,
    loadingOlder,
    error,
    refresh,
    loadOlder,
    send,
    retry,
    toggleReaction,
    softDelete,
  } = useMessages({ channelId: channelId || '' });

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: channel ? `#${channel.display_name}` : '' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {channel?.description ? (
          <AppText variant="muted" style={styles.desc}>{channel.description}</AppText>
        ) : null}
        <View style={styles.flex}>
          <MessageList
            messages={messages}
            reactions={reactions}
            profiles={profiles}
            currentUserId={user?.id ?? null}
            hasOlder={hasOlder}
            loadingOlder={loadingOlder}
            error={error}
            onLoadOlder={loadOlder}
            onToggleReaction={toggleReaction}
            onRetry={retry}
            onDelete={softDelete}
            onReload={refresh}
          />
        </View>
        {closed ? (
          <AppText variant="muted" style={styles.closedNote}>
            {t('workspace.closedNote', { pair: channel?.pair || '' })}
          </AppText>
        ) : (
          <Composer onSend={send} />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  desc: { marginBottom: Spacing.sm },
  closedNote: { paddingVertical: Spacing.md, textAlign: 'center' },
});
```

- [ ] **Step 5: Create `src/app/(tabs)/comunidade/dm/[conversationId].tsx`**:

```tsx
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageList } from '@/components/community/MessageList';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';

export default function DmScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dms } = useConversations();
  const { profiles } = useProfiles();

  const dm = dms.find((d) => d.conversationId === conversationId);
  const other = dm ? profiles[dm.memberId] : undefined;

  const {
    messages,
    reactions,
    hasOlder,
    loadingOlder,
    error,
    refresh,
    loadOlder,
    send,
    retry,
    toggleReaction,
    softDelete,
  } = useMessages({ conversationId: conversationId || '' });

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: other?.display_name || t('common.trader') }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>
          <MessageList
            messages={messages}
            reactions={reactions}
            profiles={profiles}
            currentUserId={user?.id ?? null}
            hasOlder={hasOlder}
            loadingOlder={loadingOlder}
            error={error}
            onLoadOlder={loadOlder}
            onToggleReaction={toggleReaction}
            onRetry={retry}
            onDelete={softDelete}
            onReload={refresh}
          />
        </View>
        <Composer onSend={send} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
```

- [ ] **Step 6: Create `src/app/(tabs)/comunidade/novo-dm.tsx`**:

```tsx
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { BOT_USER_ID } from '@/core/community';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { findOrCreateConversation } from '@/lib/community';

export default function NewDmScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const options = Object.values(profiles)
    .filter((p) => p.user_id !== user?.id && p.user_id !== BOT_USER_ID)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  const open = async (memberId: string) => {
    if (!user || creating) return;
    setCreating(memberId);
    try {
      const convId = await findOrCreateConversation(user.id, memberId);
      router.replace(`/comunidade/dm/${convId}` as Href);
    } catch (e: any) {
      Alert.alert(t('workspace.errorTitle'), e?.message || t('workspace.failed'));
    } finally {
      setCreating(null);
    }
  };

  return (
    <Screen>
      <SectionTitle>{t('workspace.selectUser')}</SectionTitle>
      {options.length === 0 ? (
        <EmptyState title={t('workspace.noProfiles')} />
      ) : (
        options.map((p) => (
          <Pressable key={p.user_id} onPress={() => open(p.user_id)} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: `${Colors.primary}2E` }]}>
              <AppText variant="small" style={{ color: Colors.primary, fontWeight: '800' }}>
                {(p.display_name || 'T')[0].toUpperCase()}
              </AppText>
            </View>
            <AppText style={{ fontWeight: '600', flex: 1 }}>{p.display_name}</AppText>
            {creating === p.user_id ? <Spinner /> : null}
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 7: Update `src/app/(tabs)/_layout.tsx`** — hide the tab header for `comunidade` (the nested stack now owns headers):

Change the `comunidade` `<Tabs.Screen>` options from:
```tsx
<Tabs.Screen name="comunidade" options={{ title: t('tabs.comunidade'),
  tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
```
to:
```tsx
<Tabs.Screen name="comunidade" options={{ title: t('tabs.comunidade'), headerShown: false,
  tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
```

- [ ] **Step 8: Regenerate typed routes**

Run: `npx expo customize tsconfig.json`
Expected: regenerates `.expo/types/router.d.ts` to include `/comunidade`, `/comunidade/canais/[channelId]`, `/comunidade/dm/[conversationId]`, `/comunidade/novo-dm`. Verify `git diff tsconfig.json` shows no unintended changes (revert if the tool modified it beyond no-op).

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors). The `as Href` casts cover the dynamic channel/DM paths; the typed routes file must be regenerated (Step 8) for the literals `/comunidade/novo-dm` to resolve — if tsc still complains, keep the `as Href` casts (they are present).

Run: `npx expo lint`
Expected: 0 errors (3 pre-existing warnings remain).

- [ ] **Step 10: Commit**

```bash
git add -A "src/app/(tabs)"
git add "src/app/(tabs)/comunidade"
git commit -m "feat(screens): ecrãs do workspace comunidade (canais, dms, novo-dm, feed|workspace)"
```

---

## Task 6: Final verification, review and handoff

- [ ] **Step 1: Full static pass**

Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npx expo lint`
Expected: 0 errors (3 pre-existing warnings in `planos.tsx`/`i18n/index.ts` unchanged).

- [ ] **Step 2: Self-review against spec §2 (Fase 1 scope)**

- Canais públicos (`#geral`, `#sinais`, `#duvidas`, `#resultados`, `#off-topic`) visible/writable for any authenticated user ✓ (channels seed + RLS)
- Mensagens texto + imagem, soft-delete do próprio, agrupadas por dia ✓ (Composer + storage bucket `community` + `softDelete` + `formatChatDate` day headers)
- Reações emoji toggle ✓ (chips + "+" picker + `toggleReaction`)
- Booms no `#sinais` reutilizando `BoomCard` com votação `boom_votes` ✓ (BoomMessage + backfill)
- DMs 1:1 ✓ (conversations/conversation_members + novo-dm + dm screen)
- Salas de pares pelo bot, ciclo 24h, encerrada = só leitura, reabre em novo sinal ✓ (upsert_pair_room + triggers + `pairRoomState` + composer desativado)
- Vista dupla `Feed | Workspace` ✓ (segment + CommunityFeed)
- Fora de alcance Fase 1 (threads, presença, @menções, busca, pins, editar de outros, notificações, canais PRO, perfis sociais, voz) — NOT implemented ✓

- [ ] **Step 3: Apply the migration to Supabase (manual, needs the owner)**

Open the Supabase dashboard SQL editor for project `zwxplzdadgtiohnuotlu` and run the entire `supabase/migrations/20260815000000_comunidade_workspace.sql`. Verify: 6 new tables exist; `supabase_realtime` publication includes the 6 tables; bucket `community` exists; `TMT Bot` row in `user_profiles`; booms appear as messages in `#sinais`. Then smoke-test in the app (dev build or Expo Go): segmented control, open `#geral`, send text + image, react, delete own message, open a pair room (triggered when a new boom/signal is inserted via the admin panel), verify closed room shows the read-only note, create a DM.

- [ ] **Step 4: Handoff**

Report to the user: plan implemented, baseline checks green, migration file path for them to apply, and what remains manual (Supabase apply + E2E device pass).
