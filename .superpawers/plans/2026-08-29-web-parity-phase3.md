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
| Edit | `src/lib/types.ts` (no additions — mobile keeps `StoreProduct` local to `useStoreProducts.ts`, so web does too; verify `Message` has `pending?`/`failed?` — it does) |
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

- [x] **Step 1:** Create `src/components/community/` — shadcn versions of mobile: `UserAvatar` (initials/avatar, online dot via `isUserOnline` + `UserProfile`), `CommunityHero` (channels count + live rooms), `WorkspaceSection` (title + right slot + children group), `ChannelCard`/`ChannelRow` (icon/display_name/description, premium badge, open count), `PairRoomCard`/`PairRoomRow` (pair, `pairRoomState` live/closed badges, closes-in via `formatClosesIn`), `DmRow` (avatar via profiles map, display name, created order, `onOpenProfile`).
- [x] **Step 2:** Create `ChannelPickerModal` (list of regular channels to pick for the camera/quick-share flow; premium rows gated).
- [x] **Step 3:** Port PT strings from pt.json (`workspace.*`) for all static labels.
- [x] **Step 4:** Verification: tsc/build/eslint on the new components → clean.

> **T3.4 notes:** Added `channel-meta.ts` (non-component module) holding `TILES`/`tileFor`/`ICON_MAP`/`channelIcon` — Ionicons→lucide icon map with letter-tile fallback (web has no Ionicons glyphMap). Hover uses `hover:bg-muted/60` (`bg-card-hover` does not exist). PT copy used: `AO VIVO`, "Comunidade ao vivo", "Salas, sinais e traders em tempo real.", "{{n}} canais"/"canais", "salas ativas", "Fecha em {{time}}", "Só leitura", "Sem descrição", "Entrar", "Ativo agora", "Ausente", "Trader", "Sem canais disponíveis.", "Enviar para.", "Cancelar".

## Task 3.5: Message components (Channel/DM rooms)

- [x] **Step 1:** `MessageBubble.tsx` — web port of `mobile/src/components/community/MessageBubble.tsx` (305 lines): author avatar, display name, `timeAgo`, text (rich links), image, edit indicator, failed/pending states with retry, reaction chips (`REACTION_EMOJIS`) toggle, action row (reply/edit/delete when mine, emoji react). Use `Sonner` toasts where mobile `Alert`s.
- [x] **Step 2:** `MessageList.tsx` — web port (254 lines): day separators, grouping by author/time, auto-scroll to bottom, load-more on top, typing indicator, `BoomMessage` for `user_id === BOT_USER_ID`.
- [x] **Step 3:** `Composer.tsx` — web port (244 lines): textarea (+Enter to send, shift+enter newline), image attach (file input → upload), reply preview chip, disabled states, `useIsMobile`-friendly.
- [x] **Step 4:** `BoomMessage.tsx` — bot card (20 lines).
- [x] **Step 5:** Verification: tsc/build/eslint → clean.

> **T3.5 notes:** Bucket confirmed = `community` (per `mobile/src/lib/community.ts` `uploadCommunityImage`) → the message-image bucket risk is resolved; `uploadCommunityImage` web signature is `(userId, File)` (uploads directly, no fetch). Added to `src/lib/community.ts`: `findOrCreateConversation`, `shareSignalToFeed`, `findSinaisChannelId`, `uploadCommunityImage`, `reportMessage`. Added `formatChatDate` ("Hoje"/"Ontem"/long date) to `src/lib/format.ts`. Web adaptations: DropdownMenu ("···") replaces long-press Alert for Editar/Apagar (own) and Reportar→Spam/Assédio/Inadequado/Outro; reaction picker is an inline chip row (no alert); `reportMessage` → sonner toast. Web `Button` has no `loading` prop → inline `Loader2` spinner. `BoomMessage` is self-contained (fetches `boom_times` by id, compact inline card + audio player); the full feed `BoomCard` stays in `Comunidade.tsx` until T3.6 extracts `CommunityFeed.tsx`.

## Task 3.6: /comunidade index upgrade + route wiring

- [x] **Step 1:** Read `mobile/src/hooks/useQuickCamera.ts` (50 lines) and port a web version: quick-share = file input → upload to `message-images` → `ChannelPickerModal` → post (no device camera; degraded but meaningful parity).
- [x] **Step 2:** Refactor `src/pages/Comunidade.tsx`: extract the existing Boom feed into `src/components/community/CommunityFeed.tsx` (keep all current BoomCard/vote/comment/audio behavior); index becomes header (search bar → `/comunidade/pesquisa`, camera button, loja button) + feed|workspace segment (workspace default) + sections (Canais / Salas de Pares / DMs) + skeletons + error banner with retry; `canCreateChannel = isAdminEmail(user?.email) || isPremium`; `openChannel` blocks premium channels for non-premium (`toast` instead of silent return); empty states per pt.json.
- [x] **Step 3:** Register 7 routes in `src/App.tsx` (order above catch-all): `/comunidade/canais/:channelId`, `/comunidade/dm/:conversationId`, `/comunidade/pesquisa`, `/comunidade/novo-canal`, `/comunidade/novo-dm`, `/comunidade/user/:userId`, `/comunidade/loja`. (Pages created as compiling stubs — full ports land in T3.7–T3.9.)
- [x] **Step 4:** Verification: tsc/build/eslint → clean.

> **T3.6 notes:** Web `useQuickCamera` (in `src/hooks/useQuickCamera.ts`) = file input → `ChannelPickerModal` → navigate to the channel room; pending image passed via a module-level store (`consumePendingQuickShare`) and consumed by the room `Composer` through the new `initialImage?: { file; url } | null` prop (uploads on send — mirrors mobile `pendingImageUri`; web has no camera, so the image upload happens in the room Composer, not in the hook). `CommunityFeed.tsx` extracted (kept local `timeAgo`/`getBoomStatus`/`CountdownTimer`/`AudioPlayer`/`BoomCard`; typed `FeedUser`/`FeedFilter` to satisfy `no-explicit-any`). 7 stub pages created so step 3 compiles; overwritten in T3.7–T3.9. PT copy matches pt.json (`workspace.searchPlaceholder` "Pesquisar mensagens.", `workspace.empty*` + hint keys). Build/tsc/eslint clean; Playwright smoke (anon): workspace empty states + accents render, Feed tab shows filters + "Nenhum boom encontrado", 0 console errors. **Encoding caution:** `Set-Content` on Windows PowerShell re-encoded UTF-8 as ANSI and corrupted accents in `Comunidade.tsx`; fixed by rewriting via `write` tool — never use `Set-Content` on files with non-ASCII PT strings.

## Task 3.7: Channel room + DM room screens

- [x] **Step 1:** `src/pages/ComunidadeCanal.tsx` — port `mobile/src/app/(tabs)/comunidade/canais/[channelId].tsx` (101 lines): load channel (`getChannelPayload`-style), header (back → `/comunidade`, name, `is_premium` lock when non-premium), `useMessages(channelId,'channel')` + `MessageList` + `Composer`; realtime.
- [x] **Step 2:** `src/pages/ComunidadeDm.tsx` — port `dm/[conversationId].tsx` (73 lines): ensure `conversation_members` membership (else redirect), header with peer name via profiles, `useMessages(conversationId,'dm')` + `MessageList` + `Composer`.
- [x] **Step 3:** Verification: tsc/build/eslint → clean; smoke both routes render (anon → login guard message, no crash).

> **T3.7 notes:** Web `useMessages` already matches the mobile object-signature (`useMessages({ channelId } | { conversationId })`) — device screens call it directly. Channel room consumes the T3.6 quick-share via `consumePendingQuickShare()` once on mount. Premium gate reuses web `PremiumLock` (`title`/`description`; web has no `label` prop). Room layout = `<Layout noFooter>` + `h-[calc(100vh-5rem)]` flex column, header (back `ChevronLeft` → `/comunidade`), `MessageList` fills and scrolls, sticky `Composer`. DM header = peer avatar (`UserAvatar`, `size` is `number`) + name, tap → profile. Followed mobile's no-redirect-on-non-member (parity): missing state renders `workspace.emptyDms`/`emptyChannels` note. Smoke (anon): both routes render header/composer + error-with-retry (expected RLS 400 on `messages` for anon — same as mobile), no crash, 0 lint/tsc errors, build PASS.

## Task 3.8: Search, new channel, new DM, public profile

- [x] **Step 1:** `ComunidadePesquisa.tsx` — port `pesquisa.tsx` (163 lines) using `useMessageSearch`; results grouped with channel name/peer label, tap → open channel/dm room; empty + loading states (pt.json `workspace.search*`).
- [x] **Step 2:** `ComunidadeNovoCanal.tsx` — port `novo-canal.tsx` (130 lines): name/description/type regular, premium gate; `useNavigate` back on success.
- [x] **Step 3:** `ComunidadeNovoDm.tsx` — port `novo-dm.tsx` (61 lines): user list (profiles), creates conversation + member rows (mobile logic), redirect to the DM room.
- [x] **Step 4:** `PerfilPublico.tsx` — port `user/[userId].tsx` (163 lines): profile card, role badge, online status, actions per mobile (DM → exists conversation or create), admin rules; route `/comunidade/user/:userId`.
- [x] **Step 5:** Verification: tsc/build/eslint → clean.

> **T3.8 notes:** Full PT copies per pt.json (verified by reading pt.json directly — `grep` searched sibling locales; use `read`). Search page: debounced `useMessageSearch`, `timeAgo` rows, `-webkit-box` 2-line clamp (no `line-clamp` plugin), `X` clear, autoFocus input. New channel: slug = lowercase alnum+dash+underscore, 23505 → "Já existe um canal com este nome.", success → toast + replace to the new room (fallback back to `/comunidade`). New DM: candidates exclude self + admins, `findOrCreateConversation` → replace to DM room, `DmRow` with `{ conversationId: p.user_id, memberId: p.user_id }` sentinel. Profile: `supabase.rpc('is_premium', { uid })` per profile, `isUserOnline`, admin/premium/plan badges, `findOrCreateConversation` DM button (hidden for own/admin/BOT profiles). Aligned index search placeholder to `workspace.searchPlaceholder` "Pesquisar mensagens…". tsc + eslint clean, build PASS.

## Task 3.9: Loja

- [x] **Step 1:** `src/pages/Loja.tsx` — port `mobile/src/app/(tabs)/comunidade/loja.tsx` (811 lines) with `useStoreProducts`: category chips (Bots/Mentorias/Ebooks), featured hero, product cards (icon, title, desc, price, rating, users_count, premium/grátis badges), purchase flow (web: depending on mobile behavior — pay → external/contact or planos redirect; keep parity where meaningful), currency formatting from product.currency.
- [x] **Step 2:** Verification: tsc/build/eslint → clean; smoke `/comunidade/loja` renders products from `store_products`.

> **T3.9 notes:** Ported `useStoreProducts` data path only (products come from `store_products` seeded migration, falling back to `DEFAULT_STORE_PRODUCTS` + localStorage cache). Ionicons→lucide map in-page (`ICON_MAP` with `Package` fallback; catalog icon strings are Ionicons glyph names). Hero: gradient card with storefront, subtitle `store.subtitle`, 3 stats (Produtos/Grátis/Avaliação), refresh button (web stand-in for pull-to-refresh). Featured = horizontal snap scroll (`snap-x`, 300px cards, amber ribbon). Chips: horizontal scroll, amber active, counts; `AllProducts` header + "{{count}} itens". Grid `grid-cols-2 md:3 lg:4` (mobile always 2). Product card: icon tile (accent `{color}1F`), PRO/`Grátis` badge, diamond, lock dot for locked, rating/users, price (`item.isPremium || locked → item.price`, else "Grátis"). Bottom sheet: custom fixed overlay (Escape + backdrop + X close, body scroll lock), slide-up card, category chip + badges, meta row, "O que inclui" per `INCLUDED_KEYS` (store.inc*), CTA `Tornar-se Premium` (premium variant → `/planos`) / `Pedir agora` (default → `/suporte-ia`). Back → `/comunidade`. Smoke: anon renders stats 8/4/4.5, 2 featured, all 8 products; locked sheet (bots included list) CTA → `/planos`; free sheet (ebook list) CTA → `/suporte-ia`; 0 console errors. tsc + eslint clean, build PASS.

## Task 3.10: Phase 3 verification

- [x] **Step 1:** `npx tsc --noEmit -p tsconfig.app.json` → 0; `npx tsc --noEmit` → 0.
- [x] **Step 2:** `npm run build` → PASS.
- [x] **Step 3:** eslint over all Phase 3 touched files → 0 errors.
- [x] **Step 4:** dev server + Playwright smoke: `/comunidade` (anon) → workspace empty states + login hint; authenticated default channel list (data-limited without creds: rely on seed `channels` rows — else empty states); `/comunidade/canais/:id` and `/comunidade/dm/:id` render MessageList + Composer without console errors; `/comunidade/pesquisa` renders search UI; `/comunidade/loja` renders seeded products (8 from migration); `/comunidade/novo-canal` (anon) → gated; `/comunidade/user/:userId` renders profile skeleton; feed toggle still shows the Feed.
- [x] **Step 5:** Record results in this file under `Phase 3 verification results`.

## Phase 3 verification results

- **tsc:** `npx tsc --noEmit -p tsconfig.app.json` → 0 errors; `npx tsc --noEmit` (full) → 0 errors.
- **build:** `npm run build` → PASS (chunk-size warning only, pre-existing).
- **eslint:** all Phase 3 files (lib, hooks, 14 community components, 9 pages, App.tsx) → **0 errors, 2 warnings** (known `exhaustive-deps` in `CommunityFeed.tsx`).
- **Smoke (anon, Playwright, dev server):** all routes render without console errors —
  - `/comunidade` → header (search "Pesquisar mensagens…", camera, loja), Workspace|Feed toggle, hero "Comunidade ao vivo", Canais/Salas de Pares/Mensagens Diretas empty states (0/0 + login-agnostic copy), Feed tab → "Nenhum boom encontrado".
  - `/comunidade/pesquisa` → auto-focused search box + "Sem resultados." empty state.
  - `/comunidade/novo-canal` → PremiumLock gate ("Cria canais da comunidade com um plano Premium.") + Ver Planos → `/planos`.
  - `/comunidade/novo-dm` → "Nova mensagem" + "Sem utilizadores disponíveis." (anon RLS).
  - `/comunidade/canais/:id` (fake UUID) → header, MessageList empty ("Sem mensagens ainda. Começa a conversa!"), Composer, no crash (RLS handled).
  - `/comunidade/dm/:id` (fake UUID) → peer header avatar, empty state, Composer, no crash.
  - `/comunidade/user/:id` → "Utilizador não encontrado".
  - `/comunidade/loja` → hero stats (8 Produtos / 4 Grátis / 4.5 Avaliação), 2 Destaques carousel, 4 chips with counts, 8 product cards (PRO/Grátis badges, price/rating/users); locked sheet (bots included list) CTA "Tornar-se Premium" → `/planos`; free sheet (ebooks list) CTA "Pedir agora" → `/suporte-ia`; Escape/X/backdrop close.
- **Commits (Phase 3):** T3.1 `8c89282`, T3.2 `161bc0c`, T3.3 `08bd8ea`, T3.4 `64be675`, T3.5 `cdc1827`, T3.6 `9943fa0`, T3.7 `acfda74`, T3.8 `0b39ac9`, T3.9 `8e6cf07`.
- **Deferred (documented):** authenticated flows (channel list, DM send, quick-share upload, premium purchase) not exercised without credentials — data-limited per plan note.

---

## Risks

- **Camera quick-share:** mobile uses device camera (`useQuickCamera`). Web implementation is file-input upload + channel picker — document as degraded parity, do not fake a camera.
- **Realtime volume:** `useChannels`/`useProfiles` fetch all rows; fine at current scale, matches mobile. Keep realtime listeners cleaned up on unmount (return unsubscribe).
- **Message image upload bucket:** confirmed `community` (from `mobile/src/lib/community.ts` `uploadCommunityImage`) at T3.5 — web uses the same bucket. No flag needed.
- **`search_messages` RPC** must exist in the shared project (mobile migration ran). If missing → flag, do not fallback.
- **Premium channel gating** (`channel.is_premium && !isPremium`) must mirror mobile on every entry point (index list, picker, direct URL).
- Keep Phases 1–2 consumers compiling at every task boundary.