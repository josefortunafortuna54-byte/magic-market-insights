# Comunidade Slack-like Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o feed de Booms por uma comunidade profissional estilo Slack (canais, threads, reações, presença, @menções, DMs, busca) no app mobile, com backend Supabase nativo.

**Architecture:** Backend = nova migration SQL (tabelas `channels`, `messages`, `message_reactions`, `conversations`, `conversation_members`, `user_profiles`, `notifications`; RLS + triggers + realtime + full-text). Os Booms continuam em `boom_times` mas são apresentados como mensagens especiais no canal `#sinais` (via `messages.boom_id`). Mobile = novo stack expo-router dentro de `(tabs)/comunidade/` (workspace → canal → thread → DM → membros → busca), hooks sobre Supabase Realtime, envio otimista com `client_msg_id`.

**Tech Stack:** Expo SDK 56 / RN 0.85 / expo-router 56 (typed routes) / Supabase JS v2 / React Query v5 / TypeScript. **IMPORTANTE:** antes de escrever código React Native, ler as docs versionadas em https://docs.expo.dev/versions/v56.0.0/ (exigência de `mobile/AGENTS.md`).

**Verificação (não há test framework instalado — não adicionar):** `npx expo lint` e `npx tsc --noEmit` em `mobile/`. Commit em cada tarefa.

---

## Research Summary (contexto necessário)

- **Repo git:** `mobile/` (branch `feature/comunidade-slack`). Raiz `TMT/` não é repo. Migrations SQL vivem em `supabase/` (raiz) mas o trabalho mobile é em `mobile/`.
- **Alias:** `@/* → ./src/*` (`mobile/tsconfig.json`). Alias `@/components/ui` é o toolkit UI.
- **Stack atual:** `(tabs)/comunidade.tsx` é o ficheiro a substituir por pasta `comunidade/`. Nenhum tab tem stack aninhado hoje — o padrão será novo (expo-router v56: `_layout.tsx` exportando `<Stack>` dentro do tab).
- **Auth:** `useAuth()` → `{ user, initializing, signOut }`. `user.id`, `user.user_metadata.full_name`, `user.email`.
- **Premium:** `useSubscription()` → `{ isPremium }` (lê `subscriptions.status === 'active'`).
- **Supabase client:** `src/lib/supabase.ts` (AsyncStorage, `createClient`). Storage upload pattern em `BoomCard.tsx:99-119` (FormData + cast `as any`).
- **UI kit (`src/components/ui.tsx`):** `Screen`, `AppText variant`, `Card`, `AppButton variant`, `Badge`, `Chip`, `Spinner`, `EmptyState`, `SectionTitle`, `SectionHeader`, `AppInput`, `Divider`. `PremiumLock` em `src/components/PremiumLock.tsx`.
- **Theme:** `src/core/theme.ts` → `Colors` (`bg #0A0A14`, `surface #1A1A2E`, `surfaceElevated #1F2937`, `border #2C2C5E`, `text #FFF`, `textBody`, `textMuted #9CA3AF`, `textFaint`, `primary #16A43A`, `accent #FFC915`, `secondary #108BB1`, `success #16A43A`, `destructive #EF4444`, `live #0BDF19`), `Spacing`, `Radius`, `Fonts`.
- **Core helpers:** `src/core/format.ts` (`timeAgo`, `displayName`, `avatarLetter`, `formatDateTimeWAT`, `formatShortDate`, `pad2`), `src/core/booms.ts` (`getBoomStatus`, `boomCountdown`, `LIVE_WINDOW_MS`).
- **Hooks padrão realtime:** `src/hooks/useBoomSocial.ts` (channel + filter + cleanup + polling) e `useBoomHours.ts` (react-query + `invalidateQueries`).
- **Votação existente:** `castVote` em `src/hooks/useBooms.ts:77-90` (toggle upsert `boom_votes`). `useBoomSocial(boomId)` retorna `{ comments, votes, ... }`.
- **Edge function:** `supabase/functions/admin-manage/index.ts` — handler `add_boom_time` (linhas 137-149) cria `boom_times`; precisa de passar a criar também a mensagem em `messages` do canal `#sinais`.
- **Expo Crypto:** `expo-crypto` já instalado → `import * as Crypto from 'expo-crypto'; Crypto.randomUUID()`.
- **Imagem:** instalar `expo-image-picker`; API v56: `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 })`, resultado `{ canceled, assets: [{ uri }] }`.

---

## File Structure

**Novos (backend):**
- `supabase/migrations/20260812000000_comunidade_slack_schema.sql`
- `supabase/migrations/20260812000001_comunidade_slack_seed_backfill.sql`
- `supabase/functions/admin-manage/index.ts` (modificado: `add_boom_time`)

**Novos (mobile — `mobile/src/`):**
- `core/types.ts` (adicionar tipos community)
- `lib/community.ts` (data layer)
- `hooks/useChannels.ts`
- `hooks/useChannelMessages.ts`
- `hooks/useThread.ts`
- `hooks/usePresence.ts`
- `hooks/useCommunityConversations.ts`
- `hooks/useCommunitySearch.ts`
- `hooks/useCommunityUnread.ts`
- `components/community/MessageRow.tsx`
- `components/community/Composer.tsx`
- `components/community/BoomMessageCard.tsx`
- `app/(tabs)/comunidade/_layout.tsx`
- `app/(tabs)/comunidade/index.tsx`
- `app/(tabs)/comunidade/[channelId].tsx`
- `app/(tabs)/comunidade/[channelId]/thread/[messageId].tsx`
- `app/(tabs)/comunidade/dm/[conversationId].tsx`
- `app/(tabs)/comunidade/membros.tsx`
- `app/(tabs)/comunidade/busca.tsx`

**Modificados (mobile):**
- `app/(tabs)/comunidade.tsx` (apagar)
- `app/(tabs)/_layout.tsx` (badge unread no tab)
- `package.json` (adicionar `expo-image-picker`)

---

## Task 1: Migration — schema da comunidade

**Files:**
- Create: `supabase/migrations/20260812000000_comunidade_slack_schema.sql`

- [ ] **Step 1: Escrever a migration completa**

```sql
-- Comunidade estilo Slack — schema (idempotente)
-- is_premium()
CREATE OR REPLACE FUNCTION public.is_premium(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = uid AND status = 'active');
$$;

-- ============ user_profiles ============
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Trader',
  avatar_url text DEFAULT '',
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  status text DEFAULT '',
  status_emoji text DEFAULT '',
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='user_profiles read all' AND tablename='user_profiles') THEN
    CREATE POLICY "user_profiles read all" ON public.user_profiles FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='user_profiles insert own' AND tablename='user_profiles') THEN
    CREATE POLICY "user_profiles insert own" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid()=user_id OR auth.role()='service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='user_profiles update own' AND tablename='user_profiles') THEN
    CREATE POLICY "user_profiles update own" ON public.user_profiles FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
  END IF;
END $$;

-- ============ channels ============
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '',
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='channels read' AND tablename='channels') THEN
    CREATE POLICY "channels read" ON public.channels FOR SELECT USING (
      auth.role() = 'service_role' OR (
        auth.role() = 'authenticated' AND (is_premium = false OR public.is_premium(auth.uid()))
      )
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='channels write service' AND tablename='channels') THEN
    CREATE POLICY "channels write service" ON public.channels FOR ALL USING (auth.role()='service_role');
  END IF;
END $$;

-- ============ conversations ============
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='conversations read member' AND tablename='conversations') THEN
    CREATE POLICY "conversations read member" ON public.conversations FOR SELECT USING (
      auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid()
      )
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='conversations insert auth' AND tablename='conversations') THEN
    CREATE POLICY "conversations insert auth" ON public.conversations FOR INSERT WITH CHECK (auth.role()='authenticated' OR auth.role()='service_role');
  END IF;
END $$;

-- ============ conversation_members ============
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='conv members read' AND tablename='conversation_members') THEN
    CREATE POLICY "conv members read" ON public.conversation_members FOR SELECT USING (
      auth.role()='service_role' OR EXISTS (
        SELECT 1 FROM public.conversation_members cm2 WHERE cm2.conversation_id = conversation_members.conversation_id AND cm2.user_id = auth.uid()
      )
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='conv members insert' AND tablename='conversation_members') THEN
    CREATE POLICY "conv members insert" ON public.conversation_members FOR INSERT WITH CHECK (auth.uid()=user_id OR auth.role()='service_role');
  END IF;
END $$;

-- ============ messages ============
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  text text DEFAULT '',
  image_url text DEFAULT '',
  boom_id uuid REFERENCES public.boom_times(id) ON DELETE SET NULL,
  client_msg_id text,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_scope_check CHECK (
    (channel_id IS NOT NULL AND conversation_id IS NULL)
    OR (channel_id IS NULL AND conversation_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_msg_id_key ON public.messages (client_msg_id) WHERE client_msg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_channel_id_idx ON public.messages (channel_id, created_at);
CREATE INDEX IF NOT EXISTS messages_parent_id_idx ON public.messages (parent_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages (conversation_id, created_at);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(text, ''))) STORED;
CREATE INDEX IF NOT EXISTS messages_search_idx ON public.messages USING GIN (search_vector);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='messages read' AND tablename='messages') THEN
    CREATE POLICY "messages read" ON public.messages FOR SELECT USING (
      auth.role() = 'service_role' OR (
        auth.role() = 'authenticated' AND (
          (messages.channel_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.channels c WHERE c.id = messages.channel_id AND (c.is_premium = false OR public.is_premium(auth.uid()))
          ))
          OR
          (messages.conversation_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
          ))
        )
      )
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='messages insert' AND tablename='messages') THEN
    CREATE POLICY "messages insert" ON public.messages FOR INSERT WITH CHECK (
      auth.role() = 'service_role' OR (
        auth.uid() = user_id AND (
          (NEW.channel_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.channels c WHERE c.id = NEW.channel_id AND (c.is_premium = false OR public.is_premium(auth.uid()))
          ))
          OR
          (NEW.conversation_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = NEW.conversation_id AND cm.user_id = auth.uid()
          ))
        )
      )
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='messages update own' AND tablename='messages') THEN
    CREATE POLICY "messages update own" ON public.messages FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='messages delete own' AND tablename='messages') THEN
    CREATE POLICY "messages delete own" ON public.messages FOR DELETE USING (auth.uid()=user_id);
  END IF;
END $$;

-- trigger: força author em mensagens de utilizadores autenticados
CREATE OR REPLACE FUNCTION public.force_message_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_force_message_author ON public.messages;
CREATE TRIGGER trg_force_message_author BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.force_message_author();

-- ============ message_reactions ============
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_reactions_uniq UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON public.message_reactions (message_id);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='reactions read' AND tablename='message_reactions') THEN
    CREATE POLICY "reactions read" ON public.message_reactions FOR SELECT USING (
      auth.role()='service_role' OR EXISTS (
        SELECT 1 FROM public.messages m WHERE m.id = message_reactions.message_id AND (
          (m.channel_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.channels c WHERE c.id = m.channel_id AND (c.is_premium=false OR public.is_premium(auth.uid()))
          ))
          OR (m.conversation_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = m.conversation_id AND cm.user_id = auth.uid()
          ))
        )
      )
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='reactions insert own' AND tablename='message_reactions') THEN
    CREATE POLICY "reactions insert own" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid()=user_id OR auth.role()='service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='reactions delete own' AND tablename='message_reactions') THEN
    CREATE POLICY "reactions delete own" ON public.message_reactions FOR DELETE USING (auth.uid()=user_id OR auth.role()='service_role');
  END IF;
END $$;

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('mention','reply','reaction','dm')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, is_read, created_at);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='notifications read own' AND tablename='notifications') THEN
    CREATE POLICY "notifications read own" ON public.notifications FOR SELECT USING (auth.uid()=user_id OR auth.role()='service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='notifications update own' AND tablename='notifications') THEN
    CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='notifications insert trigger' AND tablename='notifications') THEN
    CREATE POLICY "notifications insert trigger" ON public.notifications FOR INSERT WITH CHECK (auth.role()='authenticated' OR auth.role()='service_role');
  END IF;
END $$;

-- triggers de notificações
CREATE OR REPLACE FUNCTION public.notify_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  mentioned uuid;
  root_author uuid;
  other_member uuid;
BEGIN
  IF NEW.text IS NOT NULL AND NEW.text <> '' THEN
    FOR mentioned IN
      SELECT p.user_id
      FROM regexp_matches(NEW.text, '@([^@[:space:]]+)', 'g') AS m
      JOIN public.user_profiles p ON p.display_name ILIKE '%' || m[1] || '%'
      WHERE p.user_id <> NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, actor_id, message_id, channel_id)
      VALUES (mentioned, 'mention', NEW.user_id, NEW.id, NEW.channel_id);
    END LOOP;
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO root_author FROM public.messages WHERE id = NEW.parent_id;
    IF root_author IS NOT NULL AND root_author <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, actor_id, message_id, channel_id)
      VALUES (root_author, 'reply', NEW.user_id, NEW.parent_id, NEW.channel_id);
    END IF;
  END IF;
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT cm.user_id INTO other_member
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id AND cm.user_id <> NEW.user_id
    LIMIT 1;
    IF other_member IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, actor_id, message_id, channel_id)
      VALUES (other_member, 'dm', NEW.user_id, NEW.id, NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_message_insert ON public.messages;
CREATE TRIGGER trg_notify_message_insert AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_insert();

CREATE OR REPLACE FUNCTION public.notify_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  msg_author uuid;
  msg_channel uuid;
BEGIN
  SELECT user_id, channel_id INTO msg_author, msg_channel FROM public.messages WHERE id = NEW.message_id;
  IF msg_author IS NOT NULL AND msg_author <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, message_id, channel_id)
    VALUES (msg_author, 'reaction', NEW.user_id, NEW.message_id, msg_channel);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_reaction ON public.message_reactions;
CREATE TRIGGER trg_notify_reaction AFTER INSERT ON public.message_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_reaction();

-- ============ realtime ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='channels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='message_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversation_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ============ bucket community-images ============
INSERT INTO storage.buckets (id, name, public) VALUES ('community-images', 'community-images', true)
  ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='community-images read' AND tablename='objects') THEN
    CREATE POLICY "community-images read" ON storage.objects FOR SELECT USING (bucket_id = 'community-images');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='community-images upload auth' AND tablename='objects') THEN
    CREATE POLICY "community-images upload auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id='community-images' AND auth.role()='authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='community-images delete owner' AND tablename='objects') THEN
    CREATE POLICY "community-images delete owner" ON storage.objects FOR DELETE USING (bucket_id='community-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role()='service_role'));
  END IF;
END $$;
```

- [ ] **Step 2: Validar a migration localmente**

Run: `supabase db reset` (a partir de `supabase/`) OU `npx supabase migration up --db-url <url>`
Expected: sem erros; tabelas `channels`, `messages`, `message_reactions`, `conversations`, `conversation_members`, `user_profiles`, `notifications` criadas.

- [ ] **Step 3: Commit**

```bash
git add "supabase/migrations/20260812000000_comunidade_slack_schema.sql"
git commit -m "feat(db): schema comunidade slack-like (canais, mensagens, reacões, DMs, notificações)"
```

---

## Task 2: Migration — seed de canais + backfill

**Files:**
- Create: `supabase/migrations/20260812000001_comunidade_slack_seed_backfill.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Seed de canais + backfill (idempotente)
INSERT INTO public.channels (name, display_name, description, icon, is_premium) VALUES
  ('geral', 'Geral', 'Conversas gerais da comunidade', '💬', false),
  ('sinais', 'Sinais', 'Booms e sinais da equipa — discute em threads', '🎯', false),
  ('duvidas', 'Dúvidas', 'Tira as tuas dúvidas de trading', '❓', false),
  ('resultados', 'Resultados', 'Partilha e acompanha resultados', '📈', false),
  ('off-topic', 'Off-topic', 'Conversa à parte', '☕', false),
  ('estrategia-vip', 'Estratégia VIP', 'Estratégias exclusivas para membros PRO', '👑', true),
  ('sinais-avancados', 'Sinais Avançados', 'Sinais avançados para membros PRO', '🔥', true)
ON CONFLICT (name) DO NOTHING;

-- Backfill user_profiles a partir de auth.users
INSERT INTO public.user_profiles (user_id, display_name, avatar_url, role)
SELECT
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', split_part(coalesce(au.email, ''), '@', 1), 'Trader'),
  coalesce(au.raw_user_meta_data->>'avatar_url', ''),
  'member'
FROM auth.users au
ON CONFLICT (user_id) DO NOTHING;

-- Backfill: booms ativos -> mensagens no canal #sinais; comentários -> respostas de thread
DO $$
DECLARE
  sinais_id uuid;
  b record;
  new_msg uuid;
  author uuid;
BEGIN
  SELECT id INTO sinais_id FROM public.channels WHERE name = 'sinais';
  SELECT id INTO author FROM auth.users ORDER BY created_at LIMIT 1;
  IF sinais_id IS NULL OR author IS NULL THEN
    RETURN;
  END IF;
  FOR b IN SELECT * FROM public.boom_times WHERE is_active = true LOOP
    INSERT INTO public.messages (channel_id, user_id, text, image_url, boom_id, created_at)
    VALUES (sinais_id, author, '🎯 ' || b.pair || ' — Boom', b.image_url, b.id, b.created_at)
    RETURNING id INTO new_msg;

    INSERT INTO public.messages (channel_id, user_id, parent_id, text, created_at)
    SELECT sinais_id, c.user_id, new_msg, c.text, c.created_at
    FROM public.boom_comments c
    WHERE c.boom_id = b.id AND c.text <> ''
    ORDER BY c.created_at;
  END LOOP;
END $$;
```

- [ ] **Step 2: Validar**

Run: `supabase db reset` (ou `npx supabase migration up --db-url <url>`)
Expected: sem erros; canais seedados; mensagens de boom no `#sinais`; comentários antigos como replies de thread.

- [ ] **Step 3: Commit**

```bash
git add "supabase/migrations/20260812000001_comunidade_slack_seed_backfill.sql"
git commit -m "feat(db): seed canais + backfill booms/comentários/perfis"
```

---

## Task 3: Edge function — `add_boom_time` publica no #sinais

**Files:**
- Modify: `supabase/functions/admin-manage/index.ts`

- [ ] **Step 1: Ler o handler atual**

Run: `Get-Content "supabase\functions\admin-manage\index.ts" | Select-Object -Skip 130 -First 30`
Expected: bloco `add_boom_time` (linhas ~137-149) a inserir em `boom_times`.

- [ ] **Step 2: Adicionar publicações de mensagem ao criar boom**

Adicionar, logo após o insert de `boom_times` (dentro do `if (action === "add_boom_time")`, usando o `user` do `verifyAdmin` já disponível no handler), o seguinte:

```ts
      // Publica o boom como mensagem no canal #sinais
      const { data: sinais } = await supabase
        .from("channels")
        .select("id")
        .eq("name", "sinais")
        .single();
      if (sinais?.id) {
        await supabase.from("messages").insert({
          channel_id: sinais.id,
          user_id: user.id,
          text: `🎯 ${body.pair || ""} — Boom`,
          image_url: image_url || "",
          boom_id: boomId,
        });
      }
```

- [ ] **Step 3: Garantir que o handler captura o `boomId` e o `user`**

Verificar que o insert de `boom_times` retorna o id:
```ts
      const { data: boomRow, error: boomErr } = await supabase
        .from("boom_times")
        .insert({ pair, boom_time, confidence, result, image_url, audio_url, is_active: true })
        .select("id")
        .single();
      if (boomErr) return new Response(JSON.stringify({ error: boomErr.message }), { status: 400 });
      const boomId = boomRow.id;
```
(Este bloco substitui o insert original, que hoje não captura o id. O `user` vem do `verifyAdmin` — se a variável tiver outro nome no ficheiro, usar esse.)

- [ ] **Step 4: Lint**

Run: `npx eslint "supabase/functions/admin-manage/index.ts"`
Expected: sem erros.

- [ ] **Step 5: Deploy (opcional nesta fase)**

Run: `supabase functions deploy admin-manage`
Expected: deploy OK. (Pode ser feito no final junto com o deploy da migration.)

- [ ] **Step 6: Commit**

```bash
git add "supabase/functions/admin-manage/index.ts"
git commit -m "feat(fn): add_boom_time publica boom como mensagem no #sinais"
```

---

## Task 4: Tipos + helpers core (mobile)

**Files:**
- Modify: `mobile/src/core/types.ts`
- Modify: `mobile/src/core/format.ts`

- [ ] **Step 1: Adicionar tipos de comunidade em `mobile/src/core/types.ts`**

Adicionar no fim do ficheiro:

```ts
export type Channel = {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  is_premium: boolean;
  created_at: string;
};

export type UserProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string;
  role: 'admin' | 'member';
  status: string;
  status_emoji: string;
  last_seen_at: string | null;
};

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type Message = {
  id: string;
  channel_id: string | null;
  conversation_id: string | null;
  user_id: string;
  parent_id: string | null;
  text: string;
  image_url: string | null;
  boom_id: string | null;
  client_msg_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  failed?: boolean;
};

export type MessageWithReactions = Message & {
  user_profiles: UserProfile;
  message_reactions: MessageReaction[];
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
};

export type Conversation = {
  id: string;
  created_at: string;
  conversation_members?: ConversationMember[];
};

export type MyConversation = {
  conversation_id: string;
  other: UserProfile;
};

export type CommunityNotification = {
  id: string;
  user_id: string;
  type: 'mention' | 'reply' | 'reaction' | 'dm';
  actor_id: string | null;
  message_id: string | null;
  channel_id: string | null;
  is_read: boolean;
  created_at: string;
};
```

- [ ] **Step 2: Adicionar helper `formatChatDate` em `mobile/src/core/format.ts`**

Adicionar no fim:

```ts
export function formatChatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays <= 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  return formatShortDate(dateStr);
}
```

- [ ] **Step 3: Typecheck**

Run (em `mobile/`): `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add src/core/types.ts src/core/format.ts
git commit -m "feat(types): tipos de comunidade + helper formatChatDate"
```

---

## Task 5: Data layer — `mobile/src/lib/community.ts`

**Files:**
- Create: `mobile/src/lib/community.ts`

- [ ] **Step 1: Escrever o data layer**

```ts
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import type {
  Channel,
  CommunityNotification,
  Conversation,
  MessageReaction,
  MessageWithReactions,
  MyConversation,
  UserProfile,
} from '@/core/types';

function mapMessage(row: any): MessageWithReactions {
  return {
    ...row,
    image_url: row.image_url ?? null,
    boom_id: row.boom_id ?? null,
    client_msg_id: row.client_msg_id ?? null,
    edited_at: row.edited_at ?? null,
    deleted_at: row.deleted_at ?? null,
    message_reactions: row.message_reactions ?? [],
    user_profiles: row.user_profiles ?? {
      user_id: row.user_id,
      display_name: 'Trader',
      avatar_url: '',
      role: 'member' as const,
      status: '',
      status_emoji: '',
      last_seen_at: null,
    },
  };
}

export function newClientMsgId(): string {
  return Crypto.randomUUID();
}

export async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Channel[];
}

export async function fetchChannel(channelId: string): Promise<Channel | null> {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .maybeSingle();
  if (error) throw error;
  return (data as Channel) ?? null;
}

const MESSAGE_SELECT = '*, user_profiles(*), message_reactions(*)';

export async function fetchMessages(
  channelId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<MessageWithReactions[]> {
  let q = supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('channel_id', channelId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 60);
  if (opts.before) q = q.lt('created_at', opts.before);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapMessage);
}

export async function fetchDmMessages(conversationId: string): Promise<MessageWithReactions[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .is('parent_id', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapMessage);
}

export async function fetchThread(rootId: string): Promise<MessageWithReactions[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('parent_id', rootId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapMessage);
}

export async function fetchThreadCounts(messageIds: string[]): Promise<Record<string, number>> {
  if (!messageIds.length) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('parent_id')
    .in('parent_id', messageIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.parent_id] = (counts[row.parent_id] ?? 0) + 1;
  }
  return counts;
}

export async function sendMessage(input: {
  channel_id?: string;
  conversation_id?: string;
  parent_id?: string | null;
  text: string;
  image_url?: string;
  client_msg_id: string;
}): Promise<MessageWithReactions> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id: input.channel_id ?? null,
      conversation_id: input.conversation_id ?? null,
      parent_id: input.parent_id ?? null,
      text: input.text,
      image_url: input.image_url ?? '',
      client_msg_id: input.client_msg_id,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return mapMessage(data);
}

export async function editMessage(id: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ text, edited_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', uid)
    .eq('emoji', emoji)
    .maybeSingle();
  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id);
  } else {
    await supabase.from('message_reactions').insert({ message_id: messageId, user_id: uid, emoji });
  }
}

export async function getOrCreateConversation(meId: string, otherId: string): Promise<string> {
  const { data: mine } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', meId);
  const ids = (mine ?? []).map((m) => m.conversation_id);
  if (ids.length) {
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherId)
      .in('conversation_id', ids)
      .maybeSingle();
    if (shared?.conversation_id) return shared.conversation_id;
  }
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({})
    .select('id')
    .single();
  if (convErr || !conv) throw convErr ?? new Error('Falha ao criar conversa');
  const { error } = await supabase.from('conversation_members').insert([
    { conversation_id: conv.id, user_id: meId },
    { conversation_id: conv.id, user_id: otherId },
  ]);
  if (error) throw error;
  return conv.id;
}

export async function fetchMyConversations(userId: string): Promise<MyConversation[]> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('conversation_id, conversations(conversation_members(user_id))')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const others = rows
    .map((r) => (r.conversations?.conversation_members as Conversation['conversation_members'] ?? [])
      .find((m) => m.user_id !== userId)?.user_id)
    .filter((id): id is string => !!id);
  if (!others.length) return [];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', others);
  const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return rows
    .map((r) => {
      const otherId = (r.conversations?.conversation_members ?? []).find((m: any) => m.user_id !== userId)?.user_id;
      const other = otherId ? byId.get(otherId) : undefined;
      return other ? { conversation_id: r.conversation_id, other } : null;
    })
    .filter((x): x is MyConversation => !!x);
}

export async function fetchMembers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('display_name');
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function searchMessages(query: string): Promise<MessageWithReactions[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .textSearch('search_vector', query)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapMessage);
}

export async function fetchUnreadNotifications(userId: string): Promise<CommunityNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as CommunityNotification[];
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  let q = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (ids?.length) q = q.in('id', ids);
  await q;
}

export async function ensureProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
}): Promise<void> {
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (data) return;
  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trader';
  await supabase.from('user_profiles').insert({
    user_id: user.id,
    display_name: name,
    avatar_url: user.user_metadata?.avatar_url || '',
  });
}

export async function touchLastSeen(userId: string): Promise<void> {
  await supabase
    .from('user_profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId);
}

export async function uploadCommunityImage(uri: string, userId: string): Promise<string> {
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : `image/${ext}`;
  const path = `${userId}/${Date.now()}.${ext}`;
  const form = new FormData();
  form.append('file', { uri, name: path.split('/').pop(), type: mime } as any);
  const { error } = await supabase.storage
    .from('community-images')
    .upload(path, form as any, { contentType: mime, upsert: false });
  if (error) throw error;
  return supabase.storage.from('community-images').getPublicUrl(path).data.publicUrl;
}

export type { MessageReaction };
```

- [ ] **Step 2: Typecheck**

Run (em `mobile/`): `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/community.ts
git commit -m "feat(lib): data layer da comunidade (canais, mensagens, threads, reações, DMs, busca, notificações)"
```

---

## Task 6: Hooks da comunidade

**Files:**
- Create: `mobile/src/hooks/useChannels.ts`
- Create: `mobile/src/hooks/useChannelMessages.ts`
- Create: `mobile/src/hooks/useThread.ts`
- Create: `mobile/src/hooks/usePresence.ts`
- Create: `mobile/src/hooks/useCommunityConversations.ts`
- Create: `mobile/src/hooks/useCommunitySearch.ts`
- Create: `mobile/src/hooks/useCommunityUnread.ts`

- [ ] **Step 1: `useChannels.ts`**

```ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchChannels } from '@/lib/community';
import type { Channel } from '@/core/types';

export function useChannels() {
  const queryClient = useQueryClient();
  const {
    data: channels = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery<Channel[], Error>({
    queryKey: ['community-channels'],
    queryFn: fetchChannels,
    staleTime: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('community-channels-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => {
        queryClient.invalidateQueries({ queryKey: ['community-channels'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { channels, loading, error, refetch };
}
```

- [ ] **Step 2: `useChannelMessages.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  deleteMessage,
  editMessage,
  fetchMessages,
  newClientMsgId,
  sendMessage,
  toggleReaction,
  uploadCommunityImage,
} from '@/lib/community';
import type { MessageWithReactions, UserProfile } from '@/core/types';

function toProfile(user: any): UserProfile {
  return {
    user_id: user.id,
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trader',
    avatar_url: user.user_metadata?.avatar_url || '',
    role: 'member',
    status: '',
    status_emoji: '',
    last_seen_at: null,
  };
}

export function useChannelMessages(channelId: string | undefined) {
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pendingRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await fetchMessages(channelId);
      const ordered = [...data].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      pendingRef.current.clear();
      setMessages(ordered);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    setMessages([]);
    const timer = setTimeout(refresh, 0);

    const channel = supabase
      .channel(`channel-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const row = payload.new as MessageWithReactions;
          if (row.parent_id) return;
          if (pendingRef.current.has(row.client_msg_id ?? '')) {
            pendingRef.current.delete(row.client_msg_id ?? '');
            setMessages((prev) =>
              prev.map((m) => (m.client_msg_id && m.client_msg_id === row.client_msg_id ? { ...row } : m)),
            );
            return;
          }
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row }],
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const row = payload.new as MessageWithReactions;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id ? { ...m, text: row.text, image_url: row.image_url, edited_at: row.edited_at, deleted_at: row.deleted_at } : m,
            ),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => refresh())
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [channelId, refresh]);

  const send = useCallback(
    async (text: string, image?: string) => {
      if (!channelId) return;
      const trimmed = text.trim();
      if (!trimmed && !image) return;
      const {
        data: { user },
      } = await supabase.auth.getSession();
      if (!user) return;
      const client_msg_id = newClientMsgId();
      const optimistic: MessageWithReactions = {
        id: client_msg_id,
        channel_id: channelId,
        conversation_id: null,
        user_id: user.id,
        parent_id: null,
        text: trimmed,
        image_url: image ?? null,
        boom_id: null,
        client_msg_id,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        user_profiles: toProfile(user),
        message_reactions: [],
      };
      pendingRef.current.add(client_msg_id);
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      try {
        const sent = await sendMessage({ channel_id: channelId, text: trimmed, image_url: image, client_msg_id });
        setMessages((prev) =>
          prev.map((m) => (m.client_msg_id === client_msg_id ? sent : m)),
        );
      } catch (e: any) {
        setError(e.message);
        setMessages((prev) =>
          prev.map((m) => (m.id === client_msg_id ? { ...m, failed: true } : m)),
        );
      } finally {
        setSending(false);
      }
    },
    [channelId],
  );

  const sendImage = useCallback(
    async (uri: string, caption?: string) => {
      const {
        data: { user },
      } = await supabase.auth.getSession();
      if (!user) return;
      setSending(true);
      try {
        const url = await uploadCommunityImage(uri, user.id);
        await send(caption ?? '', url);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setSending(false);
      }
    },
    [send],
  );

  const loadOlder = useCallback(async () => {
    if (!channelId || !messages.length) return;
    const oldest = messages[0].created_at;
    const older = await fetchMessages(channelId, { limit: 40, before: oldest });
    setMessages((prev) => [...older.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), ...prev]);
  }, [channelId, messages]);

  return {
    messages,
    loading,
    error,
    sending,
    send,
    sendImage,
    loadOlder,
    editMessage,
    deleteMessage,
    toggleReaction,
    refresh,
  };
}
```

- [ ] **Step 3: `useThread.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchMessages, fetchThread, newClientMsgId, sendMessage } from '@/lib/community';
import type { MessageWithReactions } from '@/core/types';

export function useThread(rootId: string | undefined) {
  const [root, setRoot] = useState<MessageWithReactions | null>(null);
  const [replies, setReplies] = useState<MessageWithReactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!rootId) return;
    try {
      const [rootRow, replyRows] = await Promise.all([
        fetchMessages(rootId).then((all) => all.find((m) => m.id === rootId) ?? null),
        fetchThread(rootId),
      ]);
      setRoot(rootRow);
      setReplies(replyRows);
    } finally {
      setLoading(false);
    }
  }, [rootId]);

  useEffect(() => {
    if (!rootId) return;
    setLoading(true);
    const timer = setTimeout(refresh, 0);
    const channel = supabase
      .channel(`thread-${rootId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `parent_id=eq.${rootId}` },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => refresh(),
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [rootId, refresh]);

  const sendReply = useCallback(
    async (text: string) => {
      if (!rootId || !text.trim()) return;
      const {
        data: { user },
      } = await supabase.auth.getSession();
      if (!user) return;
      setSending(true);
      try {
        await sendMessage({
          channel_id: root.channel_id ?? undefined,
          parent_id: rootId,
          text: text.trim(),
          client_msg_id: newClientMsgId(),
        });
        await refresh();
      } finally {
        setSending(false);
      }
    },
    [rootId, root?.channel_id, refresh],
  );

  return { root, replies, loading, sending, sendReply, refresh };
}
```

- [ ] **Step 4: `usePresence.ts`**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePresence(userId: string | undefined) {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('presence:comunidade');
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ user_id: string }>();
      setOnline(new Set(Object.values(state).flat().map((p) => p.user_id).filter(Boolean)));
    });
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      setOnline((prev) => {
        const next = new Set(prev);
        newPresences.forEach((p: any) => p.user_id && next.add(p.user_id));
        return next;
      });
    });
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      setOnline((prev) => {
        const next = new Set(prev);
        leftPresences.forEach((p: any) => p.user_id && next.delete(p.user_id));
        return next;
      });
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { online };
}
```

- [ ] **Step 5: `useCommunityConversations.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchMyConversations, getOrCreateConversation } from '@/lib/community';
import type { MyConversation } from '@/core/types';

export function useCommunityConversations() {
  const [conversations, setConversations] = useState<MyConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user) {
      setLoading(false);
      return;
    }
    const data = await fetchMyConversations(user.id);
    setConversations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const channel = supabase
      .channel('community-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, () => refresh())
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const openConversation = useCallback(
    async (otherId: string): Promise<string> => {
      const {
        data: { user },
      } = await supabase.auth.getSession();
      if (!user) throw new Error('Login necessário');
      const id = await getOrCreateConversation(user.id, otherId);
      await refresh();
      return id;
    },
    [refresh],
  );

  return { conversations, loading, openConversation, refresh };
}
```

- [ ] **Step 6: `useCommunitySearch.ts`**

```ts
import { useEffect, useState } from 'react';
import { searchMessages } from '@/lib/community';
import type { MessageWithReactions } from '@/core/types';

export function useCommunitySearch(query: string) {
  const [results, setResults] = useState<MessageWithReactions[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchMessages(q);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}
```

- [ ] **Step 7: `useCommunityUnread.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchUnreadNotifications, markNotificationsRead } from '@/lib/community';

export function useCommunityUnread(userId: string | undefined) {
  const [byChannel, setByChannel] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const rows = await fetchUnreadNotifications(userId);
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = r.channel_id ?? 'dm';
      map[key] = (map[key] ?? 0) + 1;
    }
    setByChannel(map);
    setTotal(rows.length);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const channel = supabase
      .channel(`unread-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markRead = useCallback(
    (channelId: string) => {
      if (!userId) return;
      markNotificationsRead(userId);
      setByChannel((prev) => ({ ...prev, [channelId]: 0 }));
      setTotal(0);
    },
    [userId],
  );

  return { byChannel, total, markRead, refresh };
}
```

- [ ] **Step 8: Typecheck**

Run (em `mobile/`): `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useChannels.ts src/hooks/useChannelMessages.ts src/hooks/useThread.ts src/hooks/usePresence.ts src/hooks/useCommunityConversations.ts src/hooks/useCommunitySearch.ts src/hooks/useCommunityUnread.ts
git commit -m "feat(hooks): hooks de canais, mensagens, threads, presença, DMs, busca e não-lidos"
```

---

## Task 7: Navegação + workspace (index)

**Files:**
- Delete: `mobile/src/app/(tabs)/comunidade.tsx`
- Create: `mobile/src/app/(tabs)/comunidade/_layout.tsx`
- Create: `mobile/src/app/(tabs)/comunidade/index.tsx`
- Modify: `mobile/src/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Instalar expo-image-picker**

Run (em `mobile/`): `npx expo install expo-image-picker`
Expected: `expo-image-picker` adicionado ao `package.json` com versão compatível SDK 56.

- [ ] **Step 2: Apagar o ficheiro antigo**

Run: `Remove-Item -LiteralPath "src\app\(tabs)\comunidade.tsx"`

- [ ] **Step 3: Criar `comunidade/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';
import { Colors } from '@/core/theme';

export default function ComunidadeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Comunidade' }} />
      <Stack.Screen name="[channelId]" options={{ title: 'Canal' }} />
      <Stack.Screen name="[channelId]/thread/[messageId]" options={{ title: 'Thread', presentation: 'modal' }} />
      <Stack.Screen name="dm/[conversationId]" options={{ title: 'Mensagem' }} />
      <Stack.Screen name="membros" options={{ title: 'Membros' }} />
      <Stack.Screen name="busca" options={{ title: 'Busca' }} />
    </Stack>
  );
}
```

- [ ] **Step 4: Criar `comunidade/index.tsx` (workspace)**

```tsx
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText, Badge, EmptyState, Screen, Spinner, SectionHeader } from '@/components/ui';
import { PremiumLock } from '@/components/PremiumLock';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useChannels } from '@/hooks/useChannels';
import { useCommunityConversations } from '@/hooks/useCommunityConversations';
import { useCommunityUnread } from '@/hooks/useCommunityUnread';
import { usePresence } from '@/hooks/usePresence';
import { ensureProfile, touchLastSeen } from '@/lib/community';
import type { Channel } from '@/core/types';

function ChannelRow({
  channel,
  unread,
  locked,
  onPress,
}: {
  channel: Channel;
  unread: number;
  locked: boolean;
  onPress: () => void;
}) {
  const hasUnread = unread > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <AppText style={{ color: hasUnread ? Colors.text : Colors.textMuted, fontWeight: hasUnread ? '800' : '500', flex: 1 }}>
        {channel.icon ? `${channel.icon} ` : '# '}{channel.display_name}
      </AppText>
      {locked ? (
        <Ionicons name="lock-closed" size={14} color={Colors.accent} />
      ) : hasUnread ? (
        <Badge color={Colors.destructive} bg={`${Colors.destructive}1F`}>{unread}</Badge>
      ) : null}
    </Pressable>
  );
}

export default function ComunidadeWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { channels, loading } = useChannels();
  const { conversations } = useCommunityConversations();
  const { byChannel } = useCommunityUnread(user?.id);
  const { online } = usePresence(user?.id);
  const [showLock, setShowLock] = useStateSafe(false);

  useEffect(() => {
    if (user) {
      ensureProfile(user);
      touchLastSeen(user.id);
      const id = setInterval(() => touchLastSeen(user.id), 60_000);
      return () => clearInterval(id);
    }
  }, [user?.id]);

  const publicChannels = channels.filter((c) => !c.is_premium);
  const premiumChannels = channels.filter((c) => c.is_premium);

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="CANAIS" subtitle={`${publicChannels.length} canais`} />

        {loading ? (
          <Spinner label="A carregar canais…" />
        ) : (
          publicChannels.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              unread={byChannel[c.id] ?? 0}
              locked={false}
              onPress={() => router.push({ pathname: '/comunidade/[channelId]', params: { channelId: c.id } })}
            />
          ))
        )}

        <SectionHeader title="CANAIS PRO" subtitle="Exclusivos para membros PRO" style={styles.sectionGap} />
        {premiumChannels.map((c) =>
          isPremium ? (
            <ChannelRow
              key={c.id}
              channel={c}
              unread={byChannel[c.id] ?? 0}
              locked={false}
              onPress={() => router.push({ pathname: '/comunidade/[channelId]', params: { channelId: c.id } })}
            />
          ) : (
            <ChannelRow
              key={c.id}
              channel={c}
              unread={0}
              locked
              onPress={() => setShowLock(true)}
            />
          ),
        )}

        <SectionHeader title="MENSAGENS DIRETAS" subtitle="Conversas privadas" style={styles.sectionGap} />
        {conversations.length === 0 ? (
          <AppText variant="muted" style={styles.dmEmpty}>
            Ainda sem conversas. Abre o perfil de um membro para enviar mensagem direta.
          </AppText>
        ) : (
          conversations.map((c) => (
            <Pressable
              key={c.conversation_id}
              onPress={() =>
                router.push({ pathname: '/comunidade/dm/[conversationId]', params: { conversationId: c.conversation_id } })
              }
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.dmRow}>
                <View style={styles.avatarSm}>
                  <AppText variant="small" style={{ color: Colors.text, fontWeight: '800' }}>
                    {c.other.display_name?.[0]?.toUpperCase() ?? '?'}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontWeight: '600' }}>{c.other.display_name}</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: online.has(c.other.user_id) ? Colors.live : Colors.textFaint },
                      ]}
                    />
                    <AppText variant="small" style={{ color: Colors.textMuted }}>
                      {online.has(c.other.user_id) ? 'online' : 'offline'}
                    </AppText>
                  </View>
                </View>
                {(byChannel['dm'] ?? 0) > 0 && (
                  <Badge color={Colors.destructive} bg={`${Colors.destructive}1F`}>{byChannel['dm']}</Badge>
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {showLock && (
        <PremiumLock
          label="Canal PRO"
          description="Este canal é exclusivo para membros PRO. Faz upgrade para participar."
          onClose={() => setShowLock(false)}
        />
      )}
    </Screen>
  );
}

import { useState } from 'react';
function useStateSafe<T>(init: T) {
  return useState<T>(init);
}
```

- [ ] **Step 5: Verificar `PremiumLock` props**

Run: `Get-Content "src\components\PremiumLock.tsx"`
Expected: conferir se aceita `onClose`. Se não, adicionar prop opcional `onClose?: () => void` que renderiza um botão "Fechar" no modal, mantendo a navegação para `/planos`.

- [ ] **Step 6: Atualizar `(tabs)/_layout.tsx` — badge de não-lidos no tab**

Adicionar no topo do ficheiro:
```tsx
import { useAuth } from '@/hooks/useAuth';
import { useCommunityUnread } from '@/hooks/useCommunityUnread';
```
E dentro do componente, antes do `return`:
```tsx
const { user } = useAuth();
const { total } = useCommunityUnread(user?.id);
```
No `Tabs.Screen` do `comunidade` (linhas ~54-60), adicionar `options={{ ..., tabBarBadge: total > 0 ? total : undefined }}`.

- [ ] **Step 7: Regenerar typed routes + typecheck**

Run (em `mobile/`): `npx expo start` → aguardar ~15s até `.expo/types/router.d.ts` incluir `/comunidade/[channelId]`, `/comunidade/dm/[conversationId]`, `/comunidade/membros`, `/comunidade/busca`, `/comunidade/[channelId]/thread/[messageId]` → Ctrl+C.
Depois: `npx tsc --noEmit`
Expected: sem erros de rota/tipos.

- [ ] **Step 8: Lint**

Run (em `mobile/`): `npx expo lint`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add -A "src/app/(tabs)"
git add "package.json" "package-lock.json"
git commit -m "feat(comunidade): workspace com canais, canais PRO e mensagens diretas"
```

---

## Task 8: Ecrã de canal (mensagens + composer)

**Files:**
- Create: `mobile/src/app/(tabs)/comunidade/[channelId].tsx`
- Create: `mobile/src/components/community/MessageRow.tsx`
- Create: `mobile/src/components/community/Composer.tsx`

- [ ] **Step 1: Criar `components/community/MessageRow.tsx`**

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import { timeAgo } from '@/core/format';
import type { MessageReaction, MessageWithReactions } from '@/core/types';
import { BoomMessageCard } from '@/components/community/BoomMessageCard';

export type MessageRowAction = 'react' | 'reply' | 'copy' | 'edit' | 'delete';

export function MessageRow({
  message,
  replyCount,
  myId,
  canModify,
  onAction,
}: {
  message: MessageWithReactions;
  replyCount: number;
  myId: string | undefined;
  canModify: boolean;
  onAction: (action: MessageRowAction) => void;
}) {
  const profile = message.user_profiles;
  const isMine = message.user_id === myId;
  const deleted = !!message.deleted_at;

  const grouped: Record<string, MessageReaction[]> = {};
  for (const r of message.message_reactions ?? []) {
    (grouped[r.emoji] ??= []).push(r);
  }

  return (
    <Pressable onLongPress={() => onAction(canModify ? 'edit' : 'reply')} style={styles.row}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: isMine ? `${Colors.primary}2E` : `${Colors.secondary}2E` }]}>
          <AppText variant="small" style={{ color: isMine ? Colors.primary : Colors.secondary, fontWeight: '800' }}>
            {(profile?.display_name || '?')[0].toUpperCase()}
          </AppText>
        </View>
        <AppText style={{ fontWeight: '700', flexShrink: 1 }}>{profile?.display_name ?? 'Trader'}</AppText>
        {profile?.role === 'admin' ? <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>ADMIN</Badge> : null}
        <AppText variant="small" style={{ color: Colors.textMuted, marginLeft: 'auto' }}>{timeAgo(message.created_at)}</AppText>
      </View>

      <View style={styles.body}>
        {message.boom_id ? (
          <BoomMessageCard boomId={message.boom_id} />
        ) : deleted ? (
          <AppText variant="muted" style={styles.deleted}>
            <Ionicons name="trash-outline" size={13} color={Colors.textMuted} /> Mensagem removida
          </AppText>
        ) : (
          <>
            {message.text ? (
              <AppText style={styles.text}>
                {message.text}
                {message.edited_at ? <AppText variant="small" style={{ color: Colors.textMuted }}> (editado)</AppText> : null}
              </AppText>
            ) : null}
            {message.image_url ? (
              <Pressable onPress={() => onAction('copy')}>
                <View style={styles.image}>
                  <AppText variant="small" style={{ color: Colors.textMuted }}>📷 Imagem</AppText>
                </View>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      {Object.keys(grouped).length > 0 ? (
        <View style={styles.reactions}>
          {Object.entries(grouped).map(([emoji, list]) => {
            const mine = list.some((r) => r.user_id === myId);
            return (
              <Pressable
                key={emoji}
                onPress={() => onAction('react')}
                style={[styles.reaction, mine && { borderColor: Colors.primary }]}
              >
                <AppText variant="small">{emoji}</AppText>
                <AppText variant="small" style={{ color: mine ? Colors.primary : Colors.textMuted }}>{list.length}</AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.footer}>
        {replyCount > 0 ? (
          <Pressable onPress={() => onAction('reply')} style={styles.replyCta}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.secondary} />
            <AppText variant="small" style={{ color: Colors.secondary, fontWeight: '600' }}>
              {replyCount} resposta{replyCount !== 1 ? 's' : ''}
            </AppText>
          </Pressable>
        ) : (
          <Pressable onPress={() => onAction('reply')} style={styles.replyCta}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>Responder</AppText>
          </Pressable>
        )}
        {message.failed ? (
          <AppText variant="small" style={{ color: Colors.destructive }}>Não enviada</AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { paddingLeft: 38, gap: Spacing.sm },
  text: { lineHeight: 20 },
  deleted: { fontStyle: 'italic' },
  image: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, paddingLeft: 38 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingLeft: 38 },
  replyCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
```

- [ ] **Step 2: Criar `components/community/Composer.tsx`**

```tsx
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppButton, AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import type { UserProfile } from '@/core/types';

export function Composer({
  sending,
  disabled,
  members,
  onSubmit,
  onImage,
}: {
  sending: boolean;
  disabled: boolean;
  members: UserProfile[];
  onSubmit: (text: string) => void;
  onImage?: (uri: string) => void;
}) {
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const atIndexRef = useRef(-1);

  const handleChange = (value: string) => {
    setText(value);
    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0 && !value.slice(lastAt).includes(' ')) {
      atIndexRef.current = lastAt;
      setMentionQuery(value.slice(lastAt + 1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const applyMention = (name: string) => {
    const before = text.slice(0, atIndexRef.current);
    setText(`${before}@${name} `);
    setShowMentions(false);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
    setShowMentions(false);
  };

  const pickImage = async () => {
    if (!onImage) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onImage(result.assets[0].uri);
    }
  };

  const suggestions = members
    .filter((m) => m.display_name.toLowerCase().includes(mentionQuery))
    .slice(0, 5);

  return (
    <>
      {showMentions ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setShowMentions(false)}>
          <Pressable style={styles.overlay} onPress={() => setShowMentions(false)}>
            <View style={styles.mentionSheet}>
              {suggestions.length === 0 ? (
                <AppText variant="muted">Sem membros correspondentes</AppText>
              ) : (
                suggestions.map((m) => (
                  <Pressable key={m.user_id} style={styles.mentionRow} onPress={() => applyMention(m.display_name)}>
                    <AppText style={{ flex: 1 }}>{m.display_name}</AppText>
                    <AppText variant="small" style={{ color: Colors.textMuted }}>@{m.display_name}</AppText>
                  </Pressable>
                ))
              )}
            </View>
          </Pressable>
        </Modal>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={handleChange}
          placeholder="Escreve uma mensagem…"
          placeholderTextColor={Colors.textMuted}
          multiline
          style={styles.input}
        />
        <View style={styles.row}>
          {onImage ? (
            <Pressable onPress={pickImage} style={styles.iconBtn} disabled={sending}>
              <Ionicons name="image-outline" size={20} color={Colors.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              setText((t) => t + '@');
              setMentionQuery('');
              setShowMentions(true);
            }}
            style={styles.iconBtn}
          >
            <Ionicons name="at" size={20} color={Colors.textMuted} />
          </Pressable>
          <AppButton
            title="Enviar"
            onPress={submit}
            loading={sending}
            disabled={disabled || !text.trim()}
            style={{ marginLeft: 'auto', paddingVertical: 8 }}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  mentionSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  composer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  input: {
    color: Colors.text,
    minHeight: 40,
    maxHeight: 110,
    paddingHorizontal: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: { padding: 6 },
});
```

- [ ] **Step 3: Criar `comunidade/[channelId].tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, EmptyState, Spinner } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageRow, type MessageRowAction } from '@/components/community/MessageRow';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useChannelMessages } from '@/hooks/useChannelMessages';
import { fetchChannel, fetchMembers, fetchThreadCounts } from '@/lib/community';

export default function ChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    messages, loading, error, sending, send, sendImage, loadOlder,
    editMessage, deleteMessage, toggleReaction, refresh,
  } = useChannelMessages(channelId);

  const [channelName, setChannelName] = useState('#Canal');
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<Awaited<ReturnType<typeof fetchMembers>>>([]);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [actionMenu, setActionMenu] = useState<{ messageId: string; isMine: boolean } | null>(null);

  useEffect(() => {
    if (!channelId) return;
    fetchChannel(channelId).then((c) => c && setChannelName(`#${c.display_name}`));
    fetchMembers().then(setMembers).catch(() => {});
  }, [channelId]);

  useEffect(() => {
    const ids = messages.map((m) => m.id);
    if (!ids.length) return;
    fetchThreadCounts(ids).then(setReplyCounts).catch(() => {});
  }, [messages]);

  const handleAction = useCallback(
    (messageId: string, isMine: boolean) => (action: MessageRowAction) => {
      if (action === 'reply') {
        router.push({ pathname: '/comunidade/[channelId]/thread/[messageId]', params: { channelId: channelId!, messageId } });
      } else if (action === 'react') {
        Alert.alert('Reagir', 'Escolhe um emoji', [
          { text: '👍', onPress: () => toggleReaction(messageId, '👍') },
          { text: '🔥', onPress: () => toggleReaction(messageId, '🔥') },
          { text: '💰', onPress: () => toggleReaction(messageId, '💰') },
          { text: '👏', onPress: () => toggleReaction(messageId, '👏') },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } else if (action === 'copy') {
        const msg = messages.find((m) => m.id === messageId);
        if (msg?.text) Alert.alert('Copiado', msg.text);
      } else if (action === 'edit') {
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
          setActiveMessage(messageId);
          setEditText(msg.text ?? '');
          setActionMenu(null);
        }
      } else if (action === 'delete') {
        Alert.alert('Apagar mensagem?', 'Esta ação não pode ser revertida.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Apagar', style: 'destructive', onPress: () => deleteMessage(messageId) },
        ]);
      }
    },
    [messages, channelId, router, toggleReaction, deleteMessage, editMessage],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => (
      <MessageRow
        message={item}
        replyCount={replyCounts[item.id] ?? 0}
        myId={user?.id}
        canModify={item.user_id === user?.id}
        onAction={handleAction(item.id, item.user_id === user?.id)}
      />
    ),
    [messages, replyCounts, user?.id, handleAction],
  );

  const daySeparator = useCallback((msg: (typeof messages)[number]) => msg.id, [messages]);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <Spinner label="A carregar mensagens…" />
        ) : error ? (
          <EmptyState title="Erro" subtitle={error} />
        ) : messages.length === 0 ? (
          <EmptyState title="Sem mensagens ainda" subtitle="Sê o primeiro a escrever!" />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.4}
            inverted={false}
          />
        )}

        <Composer
          sending={sending}
          disabled={!!error}
          members={members}
          onSubmit={send}
          onImage={(uri) => sendImage(uri)}
        />
      </KeyboardAvoidingView>

      {/* Menu de ações */}
      <Modal transparent visible={!!actionMenu} animationType="fade" onRequestClose={() => setActionMenu(null)}>
        <Pressable style={styles.overlay} onPress={() => setActionMenu(null)}>
          <View style={styles.sheet}>
            {actionMenu?.isMine ? (
              <>
                <Pressable style={styles.actionRow} onPress={() => actionMenu && handleAction(actionMenu.messageId, true)('edit')}>
                  <AppText>✏️ Editar</AppText>
                </Pressable>
                <Pressable style={styles.actionRow} onPress={() => actionMenu && handleAction(actionMenu.messageId, true)('delete')}>
                  <AppText style={{ color: Colors.destructive }}>🗑 Apagar</AppText>
                </Pressable>
              </>
            ) : null}
            <Pressable style={styles.actionRow} onPress={() => actionMenu && handleAction(actionMenu.messageId, actionMenu.isMine)('reply')}>
              <AppText>💬 Responder em thread</AppText>
            </Pressable>
            <Pressable style={styles.actionRow} onPress={() => actionMenu && handleAction(actionMenu.messageId, actionMenu.isMine)('react')}>
              <AppText>😀 Reagir</AppText>
            </Pressable>
            <Pressable style={styles.actionRow} onPress={() => setActionMenu(null)}>
              <AppText style={{ color: Colors.textMuted }}>Cancelar</AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Editar */}
      <Modal transparent visible={!!activeMessage} animationType="fade" onRequestClose={() => setActiveMessage(null)}>
        <Pressable style={styles.overlay} onPress={() => setActiveMessage(null)}>
          <View style={styles.sheet}>
            <AppText style={{ fontWeight: '700', marginBottom: Spacing.sm }}>Editar mensagem</AppText>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              multiline
              style={styles.editInput}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setActiveMessage(null)}>
                <AppText style={{ color: Colors.textMuted }}>Cancelar</AppText>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                onPress={async () => {
                  if (activeMessage && editText.trim()) {
                    await editMessage(activeMessage, editText.trim());
                    await refresh();
                  }
                  setActiveMessage(null);
                }}
              >
                <AppText style={{ color: '#fff', fontWeight: '700' }}>Guardar</AppText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.md },
  actionRow: { paddingVertical: Spacing.md },
  editInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: Spacing.sm,
    color: Colors.text,
    minHeight: 70,
  },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  btnGhost: { backgroundColor: Colors.surfaceElevated },
  btnPrimary: { backgroundColor: Colors.primary },
});
```

- [ ] **Step 4: Dynamic header title no `[channelId].tsx`**

No topo do componente, usar `<Stack.Screen>` com o título dinâmico:

```tsx
import { Stack } from 'expo-router';
...
<Stack.Screen options={{ title: channelName }} />
```

- [ ] **Step 5: Typecheck + lint**

Run (em `mobile/`): `npx tsc --noEmit`; depois `npx expo lint`
Expected: ambos sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/app/"(tabs)"/comunidade/"\[channelId\]".tsx src/components/community/MessageRow.tsx src/components/community/Composer.tsx
git commit -m "feat(comunidade): ecrã de canal com mensagens, reações, @menções, edição e composer"
```

---

## Task 9: Ecrã de thread

**Files:**
- Create: `mobile/src/app/(tabs)/comunidade/[channelId]/thread/[messageId].tsx`

- [ ] **Step 1: Criar o ecrã de thread**

```tsx
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText, EmptyState, Spinner } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageRow } from '@/components/community/MessageRow';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useThread } from '@/hooks/useThread';

export default function ThreadScreen() {
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const { user } = useAuth();
  const { root, replies, loading, sending, sendReply } = useThread(messageId);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <Spinner label="A carregar thread…" />
        ) : !root ? (
          <EmptyState title="Mensagem não encontrada" subtitle="Pode ter sido removida." />
        ) : (
          <View style={styles.content}>
            <View style={styles.rootBox}>
              <MessageRow
                message={root}
                replyCount={replies.length}
                myId={user?.id}
                canModify={root.user_id === user?.id}
                onAction={() => {}}
              />
            </View>
            <View style={styles.divider} />
            {replies.length === 0 ? (
              <AppText variant="muted" style={{ padding: Spacing.md }}>
                Ainda sem respostas. Começa a thread!
              </AppText>
            ) : (
              replies.map((r) => (
                <MessageRow
                  key={r.id}
                  message={r}
                  replyCount={0}
                  myId={user?.id}
                  canModify={r.user_id === user?.id}
                  onAction={() => {}}
                />
              ))
            )}
          </View>
        )}

        {root ? (
          <Composer sending={sending} disabled={false} members={[]} onSubmit={sendReply} />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, padding: Spacing.md },
  rootBox: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
});
```

- [ ] **Step 2: Typecheck + lint**

Run (em `mobile/`): `npx tsc --noEmit`; depois `npx expo lint`
Expected: ambos sem erros.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(tabs)/comunidade/[channelId]/thread/[messageId].tsx"
git commit -m "feat(comunidade): ecrã de thread com respostas em tempo real"
```

---

## Task 10: Ecrã de DM

**Files:**
- Create: `mobile/src/app/(tabs)/comunidade/dm/[conversationId].tsx`

- [ ] **Step 1: Criar o ecrã de DM**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText, EmptyState, Spinner } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageRow } from '@/components/community/MessageRow';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { fetchDmMessages, sendMessage, uploadCommunityImage } from '@/lib/community';
import { newClientMsgId } from '@/lib/community';
import type { MessageWithReactions } from '@/core/types';
import { supabase } from '@/lib/supabase';

export default function DmScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { online } = usePresence(user?.id);
  const [otherName, setOtherName] = useState('Mensagem');

  const refresh = useCallback(async () => {
    if (!conversationId) return;
    const data = await fetchDmMessages(conversationId);
    setMessages(data);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(refresh, 0);
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => refresh(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => refresh())
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [conversationId, refresh]);

  useEffect(() => {
    if (!conversationId) return;
    supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .then(async ({ data }) => {
        const otherId = (data ?? []).find((m) => m.user_id !== user?.id)?.user_id;
        if (!otherId) return;
        const { data: profile } = await supabase.from('user_profiles').select('display_name').eq('user_id', otherId).single();
        if (profile) setOtherName(profile.display_name);
      });
  }, [conversationId, user?.id]);

  const send = useCallback(
    async (text: string, image?: string) => {
      if (!conversationId) return;
      setSending(true);
      try {
        await sendMessage({
          conversation_id: conversationId,
          text,
          image_url: image,
          client_msg_id: newClientMsgId(),
        });
        await refresh();
      } finally {
        setSending(false);
      }
    },
    [conversationId, refresh],
  );

  const sendImage = useCallback(
    async (uri: string) => {
      if (!user) return;
      setSending(true);
      try {
        const url = await uploadCommunityImage(uri, user.id);
        await send('', url);
      } finally {
        setSending(false);
      }
    },
    [user, send],
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <Spinner label="A carregar…" />
        ) : messages.length === 0 ? (
          <EmptyState title="Sem mensagens" subtitle="Diz olá 👋" />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MessageRow
                message={item}
                replyCount={0}
                myId={user?.id}
                canModify={item.user_id === user?.id}
                onAction={() => {}}
              />
            )}
            contentContainerStyle={styles.list}
          />
        )}
        <Composer sending={sending} disabled={false} members={[]} onSubmit={send} onImage={sendImage} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
});
```

- [ ] **Step 2: Header dinâmico com presença**

No topo do componente:
```tsx
import { Stack } from 'expo-router';
...
<Stack.Screen options={{ title: otherName }} />
```

- [ ] **Step 3: Typecheck + lint**

Run (em `mobile/`): `npx tsc --noEmit`; depois `npx expo lint`
Expected: ambos sem erros.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(tabs)/comunidade/dm/[conversationId].tsx"
git commit -m "feat(comunidade): ecrã de mensagem direta 1:1"
```

---

## Task 11: Ecrã de membros

**Files:**
- Create: `mobile/src/app/(tabs)/comunidade/membros.tsx`

- [ ] **Step 1: Criar o ecrã de membros**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText, Badge, EmptyState, Screen, Spinner } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { timeAgo } from '@/core/format';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useCommunityConversations } from '@/hooks/useCommunityConversations';
import { fetchMembers } from '@/lib/community';
import type { UserProfile } from '@/core/types';

export default function MembrosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { online } = usePresence(user?.id);
  const { openConversation } = useCommunityConversations();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setMembers(await fetchMembers());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      {loading ? (
        <Spinner label="A carregar membros…" />
      ) : members.length === 0 ? (
        <EmptyState title="Sem membros" subtitle="A comunidade está a crescer." />
      ) : (
        members.map((m) => {
          const isOnline = online.has(m.user_id);
          const isMe = m.user_id === user?.id;
          return (
            <View key={m.user_id} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: `${Colors.secondary}2E` }]}>
                <AppText style={{ color: Colors.secondary, fontWeight: '800' }}>
                  {m.display_name[0]?.toUpperCase() ?? '?'}
                </AppText>
                <View style={[styles.dot, { backgroundColor: isOnline ? Colors.live : Colors.textFaint }]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <AppText style={{ fontWeight: '700' }}>
                    {m.display_name}{isMe ? ' (tu)' : ''}
                  </AppText>
                  {m.role === 'admin' ? <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>ADMIN</Badge> : null}
                </View>
                <AppText variant="small" style={{ color: Colors.textMuted }}>
                  {m.status ? `${m.status_emoji} ${m.status}` : isOnline ? 'online agora' : m.last_seen_at ? `visto ${timeAgo(m.last_seen_at)}` : 'offline'}
                </AppText>
              </View>
              {!isMe ? (
                <Pressable
                  onPress={async () => {
                    try {
                      const id = await openConversation(m.user_id);
                      router.push({ pathname: '/comunidade/dm/[conversationId]', params: { conversationId: id } });
                    } catch (e: any) {
                      Alert.alert('Erro', e.message);
                    }
                  }}
                  style={styles.dmBtn}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.text} />
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </Screen>
  );
}

import { Alert } from 'react-native';
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  dot: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.bg },
  dmBtn: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 20, padding: 8,
  },
});
```

- [ ] **Step 2: Typecheck + lint**

Run (em `mobile/`): `npx tsc --noEmit`; depois `npx expo lint`
Expected: ambos sem erros.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(tabs)/comunidade/membros.tsx"
git commit -m "feat(comunidade): lista de membros com presença e DM"
```

---

## Task 12: Ecrã de busca

**Files:**
- Create: `mobile/src/app/(tabs)/comunidade/busca.tsx`

- [ ] **Step 1: Criar o ecrã de busca**

```tsx
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, EmptyState, Spinner } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { timeAgo } from '@/core/format';
import { useCommunitySearch } from '@/hooks/useCommunitySearch';
import { useAuth } from '@/hooks/useAuth';

export default function BuscaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const { results, loading } = useCommunitySearch(query);

  return (
    <View style={styles.screen}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Procura mensagens…"
        placeholderTextColor={Colors.textMuted}
        autoFocus
        style={styles.input}
      />
      {loading ? (
        <Spinner label="A procurar…" />
      ) : query.trim().length < 2 ? (
        <EmptyState title="Busca" subtitle="Escreve pelo menos 2 caracteres." />
      ) : results.length === 0 ? (
        <EmptyState title="Sem resultados" subtitle="Tenta outros termos." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                item.channel_id
                  ? router.push({ pathname: '/comunidade/[channelId]', params: { channelId: item.channel_id } })
                  : undefined
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <AppText style={{ fontWeight: '700', flexShrink: 1 }}>
                  {item.user_profiles?.display_name ?? 'Trader'}
                </AppText>
                <AppText variant="small" style={{ color: Colors.textMuted }}>{timeAgo(item.created_at)}</AppText>
              </View>
              {item.deleted_at ? (
                <AppText variant="muted">Mensagem removida</AppText>
              ) : (
                <AppText variant="small" numberOfLines={2} style={{ color: Colors.textBody }}>
                  {item.text || '📷 [imagem]'}
                </AppText>
              )}
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.md, gap: Spacing.md },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: Spacing.sm,
    color: Colors.text,
  },
  list: { gap: Spacing.sm },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: 4,
  },
});
```

- [ ] **Step 2: Typecheck + lint**

Run (em `mobile/`): `npx tsc --noEmit`; depois `npx expo lint`
Expected: ambos sem erros.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(tabs)/comunidade/busca.tsx"
git commit -m "feat(comunidade): busca global de mensagens"
```

---

## Task 13: Card de Boom embutido nas mensagens

**Files:**
- Create: `mobile/src/components/community/BoomMessageCard.tsx`
- Modify: `mobile/src/core/types.ts` (interface `BoomResultRow` — opcional, ver step)

- [ ] **Step 1: Criar `BoomMessageCard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, Card } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { getBoomStatus, boomCountdown } from '@/core/booms';
import { formatDateTimeWAT } from '@/core/format';
import { useBoomSocial } from '@/hooks/useBoomSocial';
import { castVote } from '@/hooks/useBooms';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { BoomTime } from '@/core/types';

export function BoomMessageCard({ boomId }: { boomId: string }) {
  const { user } = useAuth();
  const { votes } = useBoomSocial(boomId);
  const [boom, setBoom] = useState<BoomTime | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!boomId) return;
    let alive = true;
    supabase
      .from('boom_times')
      .select('*')
      .eq('id', boomId)
      .single()
      .then(({ data }) => alive && setBoom(data as BoomTime));
    const channel = supabase
      .channel(`boom-card-${boomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boom_times', filter: `id=eq.${boomId}` }, () => {
        supabase.from('boom_times').select('*').eq('id', boomId).single().then(({ data }) => alive && setBoom(data as BoomTime));
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [boomId]);

  useEffect(() => {
    if (!boom) return;
    const update = () => setCountdown(boomCountdown(boom.boom_time));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [boom]);

  if (!boom) return null;

  const status = getBoomStatus(boom.boom_time);
  const buyCount = votes.filter((v) => v.vote === 'BUY').length;
  const sellCount = votes.filter((v) => v.vote === 'SELL').length;
  const total = buyCount + sellCount;
  const buyPct = total > 0 ? Math.round((buyCount / total) * 100) : 50;
  const myVote = user ? votes.find((v) => v.user_id === user.id)?.vote ?? null : null;

  return (
    <Card style={styles.card}>
      {boom.image_url ? <Image source={{ uri: boom.image_url }} style={styles.cover} resizeMode="cover" /> : null}
      <View style={styles.topRow}>
        <Badge
          color={status === 'live' ? Colors.live : status === 'upcoming' ? Colors.warning : Colors.textMuted}
          bg={`${status === 'live' ? Colors.live : status === 'upcoming' ? Colors.warning : Colors.textMuted}1F`}
        >
          {status === 'live' ? '🚨 AO VIVO' : status === 'upcoming' ? '⏳ PRÓXIMO' : '✓ ENCERRADO'}
        </Badge>
        <AppText variant="small" style={{ color: Colors.textMuted }}>{formatDateTimeWAT(boom.boom_time)}</AppText>
      </View>

      <View style={styles.titleRow}>
        <AppText variant="h1">{boom.pair}</AppText>
        {status !== 'expired' ? (
          <AppText variant="mono" style={{ color: status === 'live' ? Colors.live : Colors.accent }}>
            {countdown}
          </AppText>
        ) : null}
      </View>

      {status === 'expired' && boom.result ? (
        <View style={styles.resultRow}>
          <Ionicons
            name={boom.result === 'BUY' ? 'trending-up' : 'trending-down'}
            size={16}
            color={boom.result === 'BUY' ? Colors.success : Colors.destructive}
          />
          <AppText style={{ color: boom.result === 'BUY' ? Colors.success : Colors.destructive, fontWeight: '800' }}>
            {boom.result}
          </AppText>
        </View>
      ) : null}

      <View style={styles.voteRow}>
        <Pressable
          onPress={() => user && castVote(boomId, user.id, 'BUY', myVote)}
          style={[styles.voteBtn, { borderColor: myVote === 'BUY' ? Colors.success : 'transparent' }]}
        >
          <AppText style={{ color: Colors.success, fontWeight: '800' }}>BUY {buyPct}%</AppText>
        </Pressable>
        <Pressable
          onPress={() => user && castVote(boomId, user.id, 'SELL', myVote)}
          style={[styles.voteBtn, { borderColor: myVote === 'SELL' ? Colors.destructive : 'transparent' }]}
        >
          <AppText style={{ color: Colors.destructive, fontWeight: '800' }}>SELL {100 - buyPct}%</AppText>
        </Pressable>
      </View>
      <AppText variant="small" style={{ color: Colors.textMuted }}>
        {total} votos
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  cover: { height: 140, borderRadius: 12, width: '100%' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: Colors.surfaceElevated,
  },
});
```

- [ ] **Step 2: Typecheck + lint**

Run (em `mobile/`): `npx tsc --noEmit`; depois `npx expo lint`
Expected: ambos sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/BoomMessageCard.tsx
git commit -m "feat(comunidade): card de boom embutido nas mensagens do #sinais"
```

---

## Task 14: Integração final + verificação completa

**Files:**
- Modify: `mobile/src/app/(tabs)/_layout.tsx` (badge — feito na Task 7, rever)
- Modify: `mobile/src/components/PremiumLock.tsx` (prop `onClose` — verificado na Task 7)

- [ ] **Step 1: Typecheck completo**

Run (em `mobile/`): `npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 2: Lint completo**

Run (em `mobile/`): `npx expo lint`
Expected: 0 erros.

- [ ] **Step 3: Arrancar a app e validar manualmente**

Run (em `mobile/`): `npx expo start`
Validar no dispositivo/emulador:
- [ ] Tab Comunidade mostra workspace com canais públicos + PRO 🔒 + DMs
- [ ] Abrir `#geral` → enviar mensagem (aparece imediatamente, optimistic)
- [ ] Reagir a uma mensagem (👍) → chip aparece
- [ ] Toque longo numa mensagem própria → editar/apagar
- [ ] Responder → abre thread → enviar reply
- [ ] `#sinais` mostra booms como cards com votação
- [ ] Canais PRO: sem ser premium → cadeado → PremiumLock → `/planos`
- [ ] Membros → presença online/offline → tocar DM → conversa 1:1
- [ ] Busca encontra mensagem por palavra
- [ ] Badge de não-lidos no tab após ser @mencionado por outro utilizador

- [ ] **Step 4: Commit final (se houver correções de integração)**

```bash
git add -A
git commit -m "fix(comunidade): integração final e verificação"
```

---

## Task 15: Deploy do backend (produção)

- [ ] **Step 1: Aplicar migrations em produção**

Run (a partir de `supabase/`): `npx supabase migration up --db-url $SUPABASE_DB_URL`
Expected: migrations 20260812000000 e 20260812000001 aplicadas.

- [ ] **Step 2: Deploy da edge function**

Run: `npx supabase functions deploy admin-manage`
Expected: deploy OK.

- [ ] **Step 3: Verificar com um utilizador real**

Validar RLS: conta free vê canais públicos mas NÃO consegue ler `channels.is_premium = true` nem as suas mensagens (SELECT devolve vazio/403).
