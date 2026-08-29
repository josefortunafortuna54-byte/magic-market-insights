# Web ↔ Mobile Parity — Phase 3 sub-plan (Comunidade workspace + Loja)

> **Part of:** `2026-08-29-web-parity-master.md` (Phase 3). Same conventions as Phases 1–2: data-logic ports from `mobile/src/`, shadcn UI re-skin, `@/` alias, no `mobile/**` edits, per-task commits, verification = `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` + per-file `eslint`.
> **Mobile truth:** each task lists the exact `mobile/src/**` files to port. PT strings come from `mobile/src/lib/i18n/locales/pt.json` (`workspace.*`, `store.*`, `userProfile.*`, `comunidade.*`, `message.*`, `composer.*` sections — verify keys at task time). Backend RPCs/tables already deployed (shared Supabase): `search_messages` (migration `mobile/supabase/migrations/20260816010000_community_search.sql`), `store_products` (`20260822010000_store_products.sql`), plus existing `channels`, `messages`, `message_reactions`, `conversations`, `conversation_members`, `user_profiles`, `presence` from Phase 1. **Do not edit migrations/schema.**

**Goal:** Upgrade `/comunidade` to the full Slack-like workspace (feed|workspace toggle, canais, salas de pares, DMs 1:1, pesquisa global, perfis públicos, loja) by porting the mobile community hooks + components + routes to web.

**Dependency order:** 3.1 (lib/community + realtime + types) → 3.2 (read hooks: channels/conversations/profiles/search) → 3.3 (write hooks: messages + store products) → 3.4 (workspace list components) → 3.5 (message components) → 3.6 (/comunidade index upgrade + routes) → 3.7 (channel + DM rooms) → 3.8 (search/new-channel/new-dm/public profile) → 3.9 (loja) → 3.10 (Phase 3 verification).

---

## Files summary

| Action | Path |
|---|---|
| Create | `src/lib/community.ts` (port `mobile/src/core/community.ts`: `BOT_USER_ID`, `REACTION_EMOJIS`, `ReactionEmoji`, `isUserOnline`, `isWeekendUtc`, `isForexSymbol`, `pairRoomState`, `pairRoomClosesInMs`, `formatClosesIn`, `mergeMessages`, `PRESENCE_ONLINE_WINDOW_MS`) |
| Create | `src/lib/realtime.ts` (port `mobile/src/lib/realtime.ts` → uses `@/lib/supabaseClient`) |
| Edit | `src/lib/types.ts` (add `StoreProduct`, `StoreCategory`; align message/notification extras if mobile has any new ones; verify `Message` has `pending?`/`failed?`) |
| Create | `src/hooks/useChannels.ts`, `useConversations.ts`, `useProfiles.ts`, `useMessageSearch.ts` (ports; realtime via `lib/realtime`) |
| Create | `src/hooks/useMessages.ts`, `src/hooks/useStoreProducts.ts` (ports; optimistic + retry for messages; catalog from `store_products`) |
| Create | `src/components/community/CommunityHero.tsx`, `WorkspaceSection.tsx`, `ChannelCard.tsx`, `ChannelRow.tsx`, `PairRoomCard.tsx`, `PairRoomRow.tsx`, `DmRow.tsx`, `UserAvatar.tsx`, `ChannelPickerModal.tsx` |
| Create | `src/components/community/MessageList.tsx`, `MessageBubble.tsx`, `Composer.tsx`, `BoomMessage.tsx`, `CommunityFeed.tsx` (web feed = extracted Boom feed from current `Comunidade.tsx`) |
| Create | `src/pages/ComunidadeCanal.tsx` (→ `/comunidade/canais/:channelId`), `ComunidadeDm.tsx` (→ `/comunidade/dm/:conversationId`), `ComunidadePesquisa.tsx` (→ `/comunidade/pesquisa`), `ComunidadeNovoCanal.tsx` (→ `/comunidade/novo-canal`), `ComunidadeNovoDm.tsx` (→ `/comunidade/novo-dm`), `PerfilPublico.tsx` (→ `/comunidade/user/:userId`), `Loja.tsx` (→ `/comunidade/loja`) |
| Edit | `src/pages/Comunidade.tsx` (feed\|workspace segment; header search/camera/loja; workspace sections + skeletons; extract feed into `CommunityFeed`) |
| Edit | `src/App.tsx` (7 new routes) |

---

## Task 3.1: Core community helpers + realtime util + types

- [ ] **Step 1:** Port `mobile/src/core/community.ts` → `src/lib/community.ts` verbatim (module-level `FOREX_SYMBOLS` Set kept private, exports as listed above). `isWeekendUtc` already exists in `src/lib/gating.ts` — keep the community.ts copy too (mirrors mobile; no import conflict between modules).
- [ ] **Step 2:** Port `mobile/src/lib/realtime.ts` → `src/lib/realtime.ts` using `@/lib/supabaseClient`. Match `subscribeToChanges(name, listeners)` contract (`event:'*'`, `schema:'public'`, `filter?`, returns unsubscribe).
- [ ] **Step 3:** Add to `src/lib/types.ts`: `StoreCategory = 'bots' | 'mentorias' | 'ebooks'` and `interface StoreProduct { id, slug, title, description, category, price, currency, icon, color, is_premium, featured, rating: number|null, users_count: number|null, active, sort_order, created_at }` (read from `useStoreProducts.ts`/migration at task time). Verify community `Channel`/`Message`/`UserProfile`/`Conversation`/`ConversationMember`/`MessageReaction` already match mobile (they do per Phase 1).
- [ ] **Step 4:** Verification: tsc/build/eslint on the 3 touched files → clean.

## Task 3.2: Read-only community hooks

- [ ] **Step 1:** Port `useChannels.ts` (select all channels ordered by created_at; realtime on `channels`; derived `regular` and `pairRooms` filtering out weekend forex pairs).
- [ ] **Step 2:** Port `useConversations.ts` (conversation_members → DmSummary list of other members, sorted by newest; realtime on `conversation_members`; uses `useAuth`).
- [ ] **Step 3:** Port `useProfiles.ts` (all `user_profiles` → `Record<userId, UserProfile>`; realtime on `user_profiles`).
- [ ] **Step 4:** Port `useMessageSearch.ts` (debounce 350ms; `supabase.rpc('search_messages', { q })` → `Message[]`; requires auth).
- [ ] **Step 5:** Verification: tsc/build/eslint on the 4 hooks → clean.

## Task 3.3: useMessages + useStoreProducts (data + writes)

- [ ] **Step 1:** Port `mobile/src/hooks/useMessages.ts` (290 lines) exactly: `useMessages(sourceId: string | null, kind: 'channel'|'dm')` returning `{ messages, loading, loadingMore, send, resend, react, unreact, editMessage, deleteMessage, hasMore, loadMore, typing, error }`-style API per mobile. Includes realtime on `messages` (filter `channel_id=eq.<id>` for channels / `conversation_id=eq.<id>` for dms), optimistic send with `client_msg_id`, retry queue, `mergeMessages`, reactions (`message_reactions`), image upload to the bucket used by mobile (`message-images` — confirm in `useMessages.ts`/Composer), typing + presence where mobile does.
- [ ] **Step 2:** Port `mobile/src/hooks/useStoreProducts.ts` (204 lines): fetch `store_products` (active, ordered), group by category, `purchase`-ish actions per mobile.
- [ ] **Step 3:** Verification: tsc/build/eslint on the 2 hooks → clean.

## Task 3.4: Workspace list components (web re-skins)

- [ ] **Step 1:** Create `src/components/community/` — shadcn versions of mobile: `UserAvatar` (initials/avatar, online dot via `isUserOnline` + `UserProfile`), `CommunityHero` (channels count + live rooms), `WorkspaceSection` (title + right slot + children group), `ChannelCard`/`ChannelRow` (icon/display_name/description, premium badge, open count), `PairRoomCard`/`PairRoomRow` (pair, `pairRoomState` live/closed badges, closes-in via `formatClosesIn`), `DmRow` (avatar via profiles map, display name, created order, `onOpenProfile`).
- [ ] **Step 2:** Create `ChannelPickerModal` (list of regular channels to pick for the camera/quick-share flow; premium rows gated).
- [ ] **Step 3:** Port PT strings from pt.json (`workspace.*`) for all static labels.
- [ ] **Step 4:** Verification: tsc/build/eslint on the new components → clean.

## Task 3.5: Message components (Channel/DM rooms)

- [ ] **Step 1:** `MessageBubble.tsx` — web port of `mobile/src/components/community/MessageBubble.tsx` (305 lines): author avatar, display name, `timeAgo`, text (rich links), image, edit indicator, failed/pending states with retry, reaction chips (`REACTION_EMOJIS`) toggle, action row (reply/edit/delete when mine, emoji react). Use `Sonner` toasts where mobile `Alert`s.
- [ ] **Step 2:** `MessageList.tsx` — web port (254 lines): day separators, grouping by author/time, auto-scroll to bottom, load-more on top, typing indicator, `BoomMessage` for `user_id === BOT_USER_ID`.
- [ ] **Step 3:** `Composer.tsx` — web port (244 lines): textarea (+Enter to send, shift+enter newline), image attach (file input → upload), reply preview chip, disabled states, `useIsMobile`-friendly.
- [ ] **Step 4:** `BoomMessage.tsx` — bot card (20 lines).
- [ ] **Step 5:** Verification: tsc/build/eslint → clean.

## Task 3.6: /comunidade index upgrade + route wiring

- [ ] **Step 1:** Read `mobile/src/hooks/useQuickCamera.ts` (50 lines) and port a web version: quick-share = file input → upload to `message-images` → `ChannelPickerModal` → post (no device camera; degraded but meaningful parity).
- [ ] **Step 2:** Refactor `src/pages/Comunidade.tsx`: extract the existing Boom feed into `src/components/community/CommunityFeed.tsx` (keep all current BoomCard/vote/comment/audio behavior); index becomes header (search bar → `/comunidade/pesquisa`, camera button, loja button) + feed|workspace segment (workspace default) + sections (Canais / Salas de Pares / DMs) + skeletons + error banner with retry; `canCreateChannel = isAdminEmail(user?.email) || isPremium`; `openChannel` blocks premium channels for non-premium (`toast` instead of silent return); empty states per pt.json.
- [ ] **Step 3:** Register 7 routes in `src/App.tsx` (order above catch-all): `/comunidade/canais/:channelId`, `/comunidade/dm/:conversationId`, `/comunidade/pesquisa`, `/comunidade/novo-canal`, `/comunidade/novo-dm`, `/comunidade/user/:userId`, `/comunidade/loja`.
- [ ] **Step 4:** Verification: tsc/build/eslint → clean.

## Task 3.7: Channel room + DM room screens

- [ ] **Step 1:** `src/pages/ComunidadeCanal.tsx` — port `mobile/src/app/(tabs)/comunidade/canais/[channelId].tsx` (101 lines): load channel (`getChannelPayload`-style), header (back → `/comunidade`, name, `is_premium` lock when non-premium), `useMessages(channelId,'channel')` + `MessageList` + `Composer`; realtime.
- [ ] **Step 2:** `src/pages/ComunidadeDm.tsx` — port `dm/[conversationId].tsx` (73 lines): ensure `conversation_members` membership (else redirect), header with peer name via profiles, `useMessages(conversationId,'dm')` + `MessageList` + `Composer`.
- [ ] **Step 3:** Verification: tsc/build/eslint → clean; smoke both routes render (anon → login guard message, no crash).

## Task 3.8: Search, new channel, new DM, public profile

- [ ] **Step 1:** `ComunidadePesquisa.tsx` — port `pesquisa.tsx` (163 lines) using `useMessageSearch`; results grouped with channel name/peer label, tap → open channel/dm room; empty + loading states (pt.json `workspace.search*`).
- [ ] **Step 2:** `ComunidadeNovoCanal.tsx` — port `novo-canal.tsx` (130 lines): name/description/type regular, premium gate; `useNavigate` back on success.
- [ ] **Step 3:** `ComunidadeNovoDm.tsx` — port `novo-dm.tsx` (61 lines): user list (profiles), creates conversation + member rows (mobile logic), redirect to the DM room.
- [ ] **Step 4:** `PerfilPublico.tsx` — port `user/[userId].tsx` (163 lines): profile card, role badge, online status, actions per mobile (DM → exists conversation or create), admin rules; route `/comunidade/user/:userId`.
- [ ] **Step 5:** Verification: tsc/build/eslint → clean.

## Task 3.9: Loja

- [ ] **Step 1:** `src/pages/Loja.tsx` — port `mobile/src/app/(tabs)/comunidade/loja.tsx` (811 lines) with `useStoreProducts`: category chips (Bots/Mentorias/Ebooks), featured hero, product cards (icon, title, desc, price, rating, users_count, premium/grátis badges), purchase flow (web: depending on mobile behavior — pay → external/contact or planos redirect; keep parity where meaningful), currency formatting from product.currency.
- [ ] **Step 2:** Verification: tsc/build/eslint → clean; smoke `/comunidade/loja` renders products from `store_products`.

## Task 3.10: Phase 3 verification

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.app.json` → 0; `npx tsc --noEmit` → 0.
- [ ] **Step 2:** `npm run build` → PASS.
- [ ] **Step 3:** eslint over all Phase 3 touched files → 0 errors.
- [ ] **Step 4:** dev server + Playwright smoke: `/comunidade` (anon) → workspace empty states + login hint; authenticated default channel list (data-limited without creds: rely on seed `channels` rows — else empty states); `/comunidade/canais/:id` and `/comunidade/dm/:id` render MessageList + Composer without console errors; `/comunidade/pesquisa` renders search UI; `/comunidade/loja` renders seeded products (8 from migration); `/comunidade/novo-canal` (anon) → gated; `/comunidade/user/:userId` renders profile skeleton; feed toggle still shows the Feed.
- [ ] **Step 5:** Record results in this file under `Phase 3 verification results`.

---

## Risks

- **Camera quick-share:** mobile uses device camera (`useQuickCamera`). Web implementation is file-input upload + channel picker — document as degraded parity, do not fake a camera.
- **Realtime volume:** `useChannels`/`useProfiles` fetch all rows; fine at current scale, matches mobile. Keep realtime listeners cleaned up on unmount (return unsubscribe).
- **Message image upload bucket/column:** confirm the exact bucket name used by `mobile/src/hooks/useMessages.ts`/`Composer` (`message-images`?); if web's Supabase project lacks it, flag (do not silently adapt) — per master-plan risk rule.
- **`search_messages` RPC** must exist in the shared project (mobile migration ran). If missing → flag, do not fallback.
- **Premium channel gating** (`channel.is_premium && !isPremium`) must mirror mobile on every entry point (index list, picker, direct URL).
- Keep Phases 1–2 consumers compiling at every task boundary.