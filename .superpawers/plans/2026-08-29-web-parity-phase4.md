# Web ↔ Mobile Parity — Phase 4 sub-plan (Admin 12 tabs + admin-gate + central de notificações)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Part of:** `2026-08-29-web-parity-master.md` (Phase 4). Same conventions as Phases 1–3: data-logic ports from `mobile/src/`, shadcn UI re-skin, `@/` alias, no `mobile/**` edits, per-task commits, verification = `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` + per-file `eslint` (warnings OK, 0 errors).
> **Mobile truth:** `mobile/src/app/(tabs)/admin.tsx` (1,787 L, 12 inline/component tabs), `mobile/src/components/admin/*` (21 files), `mobile/src/lib/adminGate.ts`, `mobile/src/lib/adminApi.ts`, `mobile/src/lib/userNotifications.ts`, `mobile/src/lib/planRequests.ts`, `mobile/src/hooks/useAdminAlerts.ts` / `useAdminSearch.ts` / `useUnreadUserNotifications.ts`, `mobile/src/app/admin-gate.tsx`, `mobile/src/app/notificacoes.tsx`. PT strings from `mobile/src/lib/i18n/locales/pt.json` (`admin.*`, `adminErrors.*`, `notificacoes.*`, `perfil.*`). Backend: shared Supabase project — RPCs `verify_admin_access_code (p_code)`, `get_users_count`; edge function `admin-manage` (action dispatch incl. `list_notifications`, `report_count`, `send_dm`, `send_push`, `list_reports`, `list_channels`, `list_announcements`, `revenue_stats`, `list_users`, `ban_user`, `update_user_role`, `update_subscription_expiry`, `bulk_delete_*`) already deployed. **Do not edit mobile, schema, or edge functions.**

**Goal:** `/admin` becomes the full 12-tab panel (with admin access-code gate), and `/notificacoes` becomes the real notification center with a nav unread badge.

**Current web state (verified):** `/admin` has 7 tabs (signals/users/boom/comunidade(→posts)/boom_times/receipts/withdrawals) guarded by email-only `AdminGuard`; `src/lib/adminApi.ts` lacks notifications, user-management, messaging, reports, channels, announcements, bulk-deletes, revenue/premium stats; `/admin-gate` and real `/notificacoes` absent (`/notificacoes` is a `PagePlaceholder`); no unread badge; `AuthContext.signOut` doesn't reset admin unlock; `src/lib/realtime.ts` matches mobile `subscribeToChanges(name, listeners)` exactly (filters per-listener via `filter` field); web uses `@tanstack/react-query` (`useQuery`) in hooks.

**Dependency order:** 4.1 admin-gate → 4.2 adminApi additions → 4.3 admin shared components → 4.4 dashboard + admin header → 4.5 messaging → 4.6 reports → 4.7 channels → 4.8 announcements → 4.9 users actions + bulk delete → 4.10 user-notifications lib + hook + navbar bell → 4.11 `/notificacoes` page → 4.12 verification.

---

## Files summary

| Action | Path |
|---|---|
| Create | `src/lib/adminGate.ts` (port `mobile/src/lib/adminGate.ts`) |
| Create | `src/pages/AdminGate.tsx` (port `mobile/src/app/admin-gate.tsx` → `/admin-gate`) |
| Create | `src/hooks/useAdminSearch.ts`, `src/hooks/useAdminAlerts.ts` (ports; alerts→sonner) |
| Edit | `src/contexts/AuthContext.tsx` (signOut → `lockAdmin()`) |
| Edit | `src/App.tsx` (routes: `/admin-gate`; replace `/notificacoes` placeholder with real page) |
| Edit | `src/pages/Admin.tsx` (12-tab layout + dashboard + header w/ NotificationBadge/Modal + pendingReports flag + gate redirect + bulk actions) |
| Edit | `src/lib/adminApi.ts` (add ~28 missing surfaces + types) |
| Edit | `src/pages/Perfil.tsx` (admin row → `/admin-gate`) |
| Create | `src/components/admin/AdminDashboardTab.tsx`, `AdminMessagingTab.tsx`, `AdminReportsTab.tsx`, `AdminChannelsTab.tsx`, `AdminAnnouncementsTab.tsx`, `SearchBar.tsx`, `FilterChips.tsx`, `BulkActionsBar.tsx`, `SkeletonList.tsx`, `ExportButton.tsx`, `NotificationBadge.tsx`, `NotificationListModal.tsx`, `UserDetailModal.tsx` |
| Edit | `src/components/admin/AdminUsersTab.tsx` (actions → UserDetailModal), `AdminSignalsTab.tsx` / `AdminBoomHoursTab.tsx` / `AdminBoomTimesTab.tsx` / `AdminComunidadeTab.tsx` (bulk selection + export) |
| Create | `src/lib/userNotifications.ts`, `src/lib/planRequests.ts`, `src/hooks/useUnreadUserNotifications.ts` |
| Create | `src/pages/Notificacoes.tsx` (port `mobile/src/app/notificacoes.tsx`) |
| Edit | `src/components/layout/Navbar.tsx` (bell + unread dot → `/notificacoes`) |
| Edit | `src/pages/Depositos.tsx` (when saving a receipt, also `notifyPlanRequestSubmitted`) |

---

## Task 4.1: Admin access-code gate

**Files:** Create `src/lib/adminGate.ts`, `src/pages/AdminGate.tsx`; Edit `src/contexts/AuthContext.tsx`, `src/App.tsx`, `src/pages/Admin.tsx`, `src/pages/Perfil.tsx`.

- [ ] **Step 1:** Create `src/lib/adminGate.ts` — verbatim port of mobile (module-level `let unlocked = false`; `isAdminUnlocked()`, `verifyAdminCode(code)` via `supabase.rpc('verify_admin_access_code', { p_code: code })` returning `data === true`, `unlockAdmin()`, `lockAdmin()`). No localStorage (session-only, parity with mobile).
- [ ] **Step 2:** Edit `src/contexts/AuthContext.tsx` — call `lockAdmin()` at the start of `signOut`.
- [ ] **Step 3:** Create `src/pages/AdminGate.tsx` — mobile parity: if `!user || !isAdminEmail(user.email)` → "Acesso restrito" screen (`admin.restrictedTitle`/`restrictedDesc`); else if `isAdminUnlocked()` already → `<Navigate to="/admin" replace />`; else shield icon + `admin.gateTitle` "Área de Administração" + `admin.gateSubtitle` + label `admin.gateCodeLabel` "CÓDIGO DE ACESSO" + numeric 6-digit input (maxLength 6, digit filter, `inputMode="numeric"`, autoFocus) + CTA `admin.gateCta` "Entrar" + inline error `admin.gateWrong` "Código incorreto. Tenta novamente." (danger box). `submit`: `verifyAdminCode(code.trim())` → `unlockAdmin(); navigate("/admin", { replace: true })`. Use `<Layout noFooter>` + back button (`ChevronLeft`) to `/comunidade`-style pattern.
- [ ] **Step 4:** Edit `src/App.tsx` — add `/admin-gate` route (unwrapped `AdminGate`, it self-guards).
- [ ] **Step 5:** Edit `src/pages/Admin.tsx` — after the existing email check, add: `if (user && isAdminEmail(user.email) && !isAdminUnlocked()) { navigate("/admin-gate", { replace: true }); return; }`.
- [ ] **Step 6:** Edit `src/pages/Perfil.tsx` — admin menu row href `"/admin"` → `"/admin-gate"`.
- [ ] **Step 7:** Verification: tsc + `npx eslint src/lib/adminGate.ts src/pages/AdminGate.tsx src/contexts/AuthContext.tsx src/pages/Admin.tsx src/pages/Perfil.tsx` → 0 errors; build PASS; smoke: anon `/admin-gate` shows restricted state (unless admin email logged in, which we can't test) — verify no crash + `/admin-gate` route renders for anon with "Acesso restrito".

## Task 4.2: adminApi additions

**Files:** Edit `src/lib/adminApi.ts`.

- [ ] **Step 1:** Add types and all missing wrappers (same `callAdminFn` transport — mirror mobile action names exactly). Types to add (port `mobile/src/core/types.ts` exactly): `NotificationType = 'receipt_pending'|'receipt_approved'|'receipt_rejected'|'withdrawal_pending'|'signal_closed'|'signal_tp'|'signal_sl'|'new_user'|'subscription_expired'|'subscription_expiring'|'system_error'` (closed union), `AdminNotification { id: string; type: NotificationType; title: string; message: string; entity_type?: string; entity_id?: string; data?: Record<string, unknown>; read: boolean; created_at: string }` — rendered field is `message` (NOT `body`), no `user_id`; `MessageReport { id, message_id, reporter_id, reason, details, status, reviewed_by, reviewed_at, created_at, messages?{text,user_id,channel_id,conversation_id}, reporter?{email} }`, `AdminChannel { id, name, display_name, description, icon, type, is_premium, created_at, updated_at }`, `AdminAnnouncement { id, title, body, image_url, link, link_label, is_active, sort_order, created_at, updated_at }`, `AdminUser { id, email, created_at, last_sign_in_at, role?, subscription_status?, subscription_expires? }`, `RevenueStats { thisMonthRevenue, lastMonthRevenue, thisMonthByPlan, lastMonthByPlan, thisMonthCount, pendingWithdrawalsAmount }`.
- [ ] **Step 2:** Add functions (name → action): `getNotifications(limit=50)` → `list_notifications`; `markNotificationRead(id)` → `mark_notification_read`; `markAllNotificationsRead()` → `mark_all_notifications_read`; `getUnreadCount()` → `unread_count`; `listUsers()` → `list_users`; `premiumCount()` → `premium_count`; `expiringCount()` → `expiring_count`; `revenueStats()` → `revenue_stats`; `closeSignals(): Promise<number>` → POST `/functions/v1/close-signals`, return `data.closed`; `banUser(userId)` → `ban_user`; `updateUserRole(userId, role)` → `update_user_role`; `updateSubscriptionExpiry(userId, expiresAt)` → `update_subscription_expiry`; `sendDm(userId, text)` → `send_dm`; `sendPush(userIds, title, message)` → `send_push`; `listReports(status?)` → `list_reports`; `dismissReport(id)` → `dismiss_report`; `actOnReport(id, deleteMessage)` → `act_on_report`; `reportCount()` → `report_count`; `listChannels()` → `list_channels`; `updateChannel(id, updates)` → `update_channel`; `deleteChannel(id)` → `delete_channel`; `toggleChannelPremium(id)` → `toggle_channel_premium`; `listAnnouncements()` → `list_announcements`; `upsertAnnouncement(data)` → `upsert_announcement`; `deleteAnnouncement(id)` → `delete_announcement`; `bulkDeleteSignals(ids)` → `bulk_delete_signals`; `bulkDeleteBoomHours(ids)` → `bulk_delete_boom_hours`; `bulkDeleteBoomTimes(ids)` → `bulk_delete_boom_times`; `bulkDeletePosts(ids)` → `bulk_delete_posts`.
- [ ] **Step 3:** Verification: tsc + eslint on `src/lib/adminApi.ts` → 0 errors; build PASS.

## Task 4.3: Admin shared components (web re-skins)

**Files:** Create `src/components/admin/SearchBar.tsx`, `FilterChips.tsx`, `BulkActionsBar.tsx`, `SkeletonList.tsx`, `ExportButton.tsx`, `NotificationBadge.tsx`, `NotificationListModal.tsx`, `UserDetailModal.tsx`; Create `src/hooks/useAdminSearch.ts`, `src/hooks/useAdminAlerts.ts`.

- [ ] **Step 1:** `SearchBar` — `{ value, onChange, placeholder? }`; rounded search input + `X` clear (like ComunidadePesquisa), label/icon `Search`.
- [ ] **Step 2:** `FilterChips` — `{ filters: FilterConfig[]; activeFilters: string[]; onToggle(f); onClear() }`; `FilterConfig { key, label, value }`; horizontal chips + "Limpar filtros" when active.
- [ ] **Step 3:** `BulkActionsBar` — `{ selectedCount, onDelete, onCancel }`; sticky bottom bar "{{count}} selecionados" + Cancelar / Apagar selecionados (`admin.selectedCount`/`cancel`/`deleteSelected`).
- [ ] **Step 4:** `SkeletonList` — `{ count?, variant? }`; pulsing rows (animate-pulse).
- [ ] **Step 5:** `ExportButton` — `{ data, filename, columns: {key,label}[], label? }`; client-side CSV download (Blob + a[download]); empty data → alert `adminErrors.export`.
- [ ] **Step 6:** `NotificationBadge` — `{ count, onPress }`; `Bell` + red count bubble (cap 99+).
- [ ] **Step 7:** `NotificationListModal` — port `NotificationListModal.tsx`: `{ open, notifications, onClose, onMarkRead(id), onMarkAllRead() }`; shadcn `Dialog`/custom overlay; TYPE_ICONS map keyed by the real `NotificationType` union (port `mobile/src/components/admin/NotificationListModal.tsx:19–31` verbatim, lucide pick per key): `receipt_pending`→Receipt/`FileText`, `receipt_approved`→`CheckCircle2`, `receipt_rejected`→`XCircle`, `withdrawal_pending`→`Wallet`/`Banknote`, `signal_closed`→`TrendingDown`, `signal_tp`→`CheckCheck`, `signal_sl`→`X`, `new_user`→`UserPlus`, `subscription_expired`→`CreditCard`, `subscription_expiring`→`Clock`, `system_error`→`AlertCircle`; fallback `Bell`. Type it `Record<NotificationType, LucideIcon>` so TS rejects any missing union key; unread row bold + "Marcar todas como lidas" (`admin.markAllRead`), empty → `admin.noNotifications`.
- [ ] **Step 8:** `UserDetailModal` — port props `{ user, open, onClose, onBan, onRoleChange, onExpiryChange }` (all `Promise<void>`); user hero (avatar initials, role/banned/status), info card (reg date, last access, expiry with days-left color), Plan & Subscrição (Free/Premium), expiry presets 7/30/90/365 dias + "Sem limite" (`admin.editExpiration`), Zona de Perigo ban/unban (`admin.banUser`/`admin.unbanUser`); confirm via sonner toast on success, `confirm()` for ban.
- [ ] **Step 9:** `src/hooks/useAdminSearch.ts` — verbatim port (pure client hook; search 300ms debounce across `searchFields`, equality `filterField` filter, `filteredData`, `hasActiveFilters`).
- [ ] **Step 10:** `src/hooks/useAdminAlerts.ts` — port the state shape but render via sonner `toast.success/error/warning/info` (no custom Toast component needed); return `{ toasts, showSuccess, showError, showWarning, showInfo, dismiss }`.
- [ ] **Step 11:** Verification: tsc + eslint over all new files → 0 errors; build PASS.

## Task 4.4: Admin 12-tab layout + Dashboard + header

**Files:** Create `src/components/admin/AdminDashboardTab.tsx`; Edit `src/pages/Admin.tsx`.

- [ ] **Step 1:** Rewrite `Admin.tsx` tab union + order to mobile: `'dashboard'|'receipts'|'signals'|'boom'|'boom_times'|'posts'|'users'|'withdrawals'|'messaging'|'reports'|'channels'|'announcements'` with PT labels `tabDashboard "Dashboard", tabReceipts "Comprovativos", tabSignals "Sinais", tabBoom "Boom Hours", tabBoomTimes "Boom Times", tabPosts "Posts", tabUsers "Usuários", tabWithdrawals "Levantamentos", tabMessaging "Mensagens", tabReports "Reports", tabChannels "Canais", tabAnnouncements "Anúncios"`. Keep existing tab components (`AdminSignalsTab`, `AdminBoomHoursTab`, `AdminComunidadeTab`=posts, `AdminBoomTimesTab`, `AdminUsersTab`, `AdminReceiptsTab`, `AdminWithdrawalsTab`). Add gate redirect (T4.1).
- [ ] **Step 2:** Admin header: `admin.title` "Admin", refresh button (re-run `loadData` + tab self-loads), `<NotificationBadge count={unreadAdmin} onPress={() => setShowNotifications(true)} />` wired to `NotificationListModal` (`getNotifications(50)`, `markNotificationRead`, `markAllNotificationsRead`), and a red flag chip with `pendingReports` (from `adminApi.reportCount()`) that sets tab to `reports`. Auto-refresh notifications count every 30s + after modal closes.
- [ ] **Step 3:** `AdminDashboardTab` — props `{ stats, busy, run, onRefresh }` (mirror mobile DashboardPanel): fetch `revenueStats()` on mount; 6 stat cards (`statUsers "Usuários"`, `statSignalsToday "Sinais Hoje"`, `statWinRate "Taxa de Acerto"` = tp/(tp+sl)%, `statPremium "Premium"`, `statExpiring "Expira em Breve"`, `statPendingReceipts "Comprovativos Pendentes"`); revenue section "Receita (Mês)" USD + AOA (Kz), "Pagamentos" thisMonthCount, "Levantamentos Pendentes" (pendingWithdrawalsAmount.usd/aoa); Actions "Gerar Sinais" + "Fechar TP/SL" with busy spinner + toast (`doneClose`/`doneGenerate`/errors → `adminErrors.*`).
- [ ] **Step 4:** Wire `loadData`: keep existing direct `.from()` reads (`signals`, `boom_hours`, `posts`, `boom_times`, RPC `get_users_count`) + add `adminApi.revenueStats()` (dashboard), `getNotifications(50)`, `reportCount()`, `premiumCount()`, `expiringCount()`. Compute dashboard `stats` object.
- [ ] **Step 5:** Remove the now-duplicated "Limpar e Regenerar" quick action if it duplicates bulk signals handling (keep a Dashboard-only "Gerar Sinais").
- [ ] **Step 6:** Verification: tsc + `npx eslint` on `src/pages/Admin.tsx` + `src/components/admin/AdminDashboardTab.tsx` → 0 errors; build PASS.

## Task 4.5: Admin Messaging tab

**Files:** Create `src/components/admin/AdminMessagingTab.tsx`.

- [ ] **Step 1:** Port `MessagingPanel.tsx` copy verbatim (hardcoded on mobile; NO `admin.sendDm`/`admin.pushTitle`/`admin.pushMessage`/`admin.send` keys exist in pt.json): two sub-tabs **DM Direta** / **Push Broadcast**; DM section label "Enviar DM como TMT Bot", searchable user list from `adminApi.listUsers()` (row = email + ⭐ when `subscription_status === 'active'`), textarea placeholder "Mensagem...", button "Enviar DM" / "A enviar...", success toast `` `DM enviada! ${result.notified} notificações` ``, error toast `e.message`; Push section label "Enviar Push Notification", placeholders "Título" / "Mensagem", "Enviar para:" target segmented Todos / Premium / Free (`'all'|'premium'|'free'`, `userIds = null | premiumIds | freeIds` derived from `listUsers()` subscription_status), button "Enviar Push" / "A enviar...". Empty selection guard toast: "Seleciona um utilizador e escreve a mensagem".
- [ ] **Step 2:** Verification: tsc + `npx eslint` on the new file → 0 errors; build PASS.

## Task 4.6: Admin Reports tab

**Files:** Create `src/components/admin/AdminReportsTab.tsx`.

- [ ] **Step 1:** Port `ReportsPanel.tsx` copy verbatim (hardcoded on mobile; there is NO `admin.noReports` key — mobile uses "Sem reports"): `adminApi.listReports()`; summary cards labels Pendentes / Dispensados / Ação tomada; `FilterChips` by `status` (`pending|dismissed|acted`, labels Pendente/Dispensado/Ação tomada); report cards with REASON_LABELS hardcoded map `{ spam: '🚫 Spam', harassment: '⚠️ Assédio', inappropriate: '🔞 Inadequado', other: '❓ Outro' }`, quoted message `“{messages.text}”`, "Reportado por: {reporter.email || 'desconhecido'}"; pending-actions buttons "Apagar Msg" (`actOnReport(id, true)`) + "Dispensar" (`dismissReport(id)`); acted/dismissed footer "✅ Ação tomada" / "⬜ Dispensado"; dialogs: Dispensar/"Marcar como dispensado?", Ação/"O que queres fazer?"/"Apagar mensagem"/"Marcar como visto"; toasts "Dispensado"/"Mensagem apagada"/"Processado"; empty → "Sem reports".
- [ ] **Step 2:** Verification: tsc + `npx eslint` on the new file → 0 errors; build PASS.

## Task 4.7: Admin Channels tab

**Files:** Create `src/components/admin/AdminChannelsTab.tsx`.

- [ ] **Step 1:** Port `ChannelsPanel.tsx` copy verbatim (hardcoded on mobile; NO `admin.editChannel` key — use the exact strings below): `adminApi.listChannels()`; `SearchBar` placeholder "Pesquisar canais..."; sections "Canais Regulares ({n})" + "Pair Rooms ({n})"; row shows `{display_name}`, sub `/{name} • {type} • {timeAgo}` + description, `⭐ PREMIUM` amber badge when `is_premium`; buttons Editar / (`Rem. Premium` | `Premium`) / Apagar (pair rows omit Apagar); edit modal heading "Editar Canal", inputs placeholders "Nome"/"Descrição", buttons Cancelar/Guardar → `updateChannel`, success toast "Canal atualizado!"; premium toggle Alert headers "Remover Premium"/"Tornar Premium" + `"${display_name}"?` + "Confirmar" → toast "Atualizado"; delete Alert "Apagar Canal" + `"${display_name}"? Mensagens serão apagadas.` + "Apagar" → `deleteChannel` (confirm), success toast **"Apagado"** (NOT "Eliminado")"; empty → "A carregar...".
- [ ] **Step 2:** Verification: tsc + `npx eslint` on the new file → 0 errors; build PASS.

## Task 4.8: Admin Announcements tab

**Files:** Create `src/components/admin/AdminAnnouncementsTab.tsx`.

- [ ] **Step 1:** Port `AnnouncementsPanel.tsx` copy verbatim (hardcoded on mobile; NO `admin.newAnnouncement`/`admin.editAnnouncement`/`admin.announcementTitle` keys): "+ Novo Anúncio" CTA; list sorted by `sort_order`; card shows `#{sort_order}` + `timeAgo`, title, body (2 lines), link + label, `Inativo` muted badge when `!is_active`; actions Editar / (Desativar | Ativar) / Apagar (`upsertAnnouncement`, `deleteAnnouncement`, with confirm); modal heading "Novo Anúncio" / "Editar Anúncio"; inputs placeholders "Título *", "Descrição (opcional)", "URL da imagem (opcional)", "Link ao tocar (/planos ou https://…)", "Texto do botão do link (opcional)", "Ordem (0 = primeiro)" (numeric-only), `Ativo` checkbox; buttons Cancelar / Guardar (disabled until title), success toast on save/delete. Existing pt.json keys available for the tab bar only (`admin.tabAnnouncements "Anúncios"`).
- [ ] **Step 2:** Verification: tsc + `npx eslint` on the new file → 0 errors; build PASS.

## Task 4.9: Users actions + bulk delete

**Files:** Edit `src/components/admin/AdminUsersTab.tsx`, `AdminSignalsTab.tsx`, `AdminBoomHoursTab.tsx`, `AdminBoomTimesTab.tsx`, `AdminComunidadeTab.tsx`.

- [ ] **Step 1:** `AdminUsersTab` — load `adminApi.listUsers()` (replace/augment Props: keep `usersList`+`subsData` props but add row actions): add per-row "Ver detalhes" opening `UserDetailModal` (`banUser` / `updateUserRole('free'|'premium')` — plan-role semantics from `UserDetailModal.makePlanOptions`, NOT 'admin'/'member' / `updateSubscriptionExpiry(expiresAt|null)`); premium derived from `subscription_expires`/`subsData`. Keep the existaing columns; add Premium column w/ dot. Toast on success (`userBanned`/`userUnbanned`/`roleUpdated`/`expiryUpdated`).
- [ ] **Step 2:** `AdminSignalsTab` — add selection mode: per-row checkbox + `BulkActionsBar` (`bulkDeleteSignals(ids)`); header row `ExportButton` (`Exportar sinais` → CSV of filtered signals) + pair/filter chips via `useAdminSearch` where feasible (at minimum: search + status filter).
- [ ] **Step 3:** `AdminBoomHoursTab`, `AdminBoomTimesTab`, `AdminComunidadeTab` — same selection + `bulkDeleteBoomHours/BoomTimes/Posts` + `ExportButton` per tab (`Exportar horários`/`Exportar boom times`/`Exportar posts`).
- [ ] **Step 4:** Verification tsc/eslint/build.

## Task 4.10: User-notifications lib + unread hook + Navbar bell

**Files:** Create `src/lib/userNotifications.ts`, `src/lib/planRequests.ts`, `src/hooks/useUnreadUserNotifications.ts`; Edit `src/components/layout/Navbar.tsx`, `src/pages/Depositos.tsx`.

- [ ] **Step 1:** `userNotifications.ts` — port exports exactly (supabase, RLS per user): `fetchUserNotifications(limit=30)`, `countUnreadUserNotifications()`, `markAllUserNotificationsRead()`, `deleteUserNotification(id)`, `clearUserNotifications()`. Type `UserNotification { id, title, body, kind, read, created_at }`.
- [ ] **Step 2:** `planRequests.ts` — localStorage equivalent of `mobile/src/lib/planRequests.ts`: key `plan_requests`; `PlanRequestEntry { id, title, body, createdAt }`; `getPlanRequests()` (JSON parse), `removePlanRequest(id)`, `clearPlanRequests()`, `pruneExpiredPlanRequests(maxAgeMs=24h+30min)`, `notifyPlanRequestSubmitted(plan, amount)` — pushes entry `{ id: 'plan-request-'+Date.now(), title: notifications.planRequestTitle `Plano {{plan}} — pedido recebido`, body: planRequestBodyAmount `Pedido do plano {{plan}} ({{amount}}) encaminhado. Conclusão em até 24 horas.` }` keeping newest 10.
- [ ] **Step 3:** `useUnreadUserNotifications.ts` — port mobile: react-query `useQuery(['user-notifications-unread', user?.id], countUnreadUserNotifications, { enabled: !!user, refetchInterval: 30_000, staleTime: 10_000 })` + realtime `subscribeToChanges` on `user_notifications` filter `user_id=eq.<id>` → invalidate query. Return `{ unread }`.
- [ ] **Step 4:** `Navbar.tsx` — for logged-in users add a bell button (`Bell` icon + small red dot when `unread > 0`) next to the user button, `Link`ed to `/notificacoes`; use `useUnreadUserNotifications()`.
- [ ] **Step 5:** `Depositos.tsx` — after successful non-capital `saveReceipt`, also `notifyPlanRequestSubmitted(plan, amount)` (before/after the `pending_plan_payment` write). Import from `@/lib/planRequests`.
- [ ] **Step 6:** Verification: tsc + eslint (all touched) → 0 errors; build PASS.

## Task 4.11: Notificacoes page

**Files:** Create `src/pages/Notificacoes.tsx`; Edit `src/App.tsx`.

- [ ] **Step 1:** Port `mobile/src/app/notificacoes.tsx` for web (sources: `fetchUserNotifications(30)` server rows + `getPlanRequests()` localStorage; drop expo local-notifications source). Merge → `NotifItem[]` sorted desc by `createdAt`. Grouping: `Hoje` / `Esta semana` / `Anteriores` (compare to day boundaries); kind detection (`kindOf`: kind==='plan'→plan; title regex `/boom|alarme/i`→boom; `/premium|plano|oferta|pedido/i`→plan; `/sinal|signal|\btp\b|\bsl\b/i`→signal; else other) with lucide icon+color map.
- [ ] **Step 2:** Rows: title, body, meta — plan-request → badge "Pendente" + "Em análise"; else relative time (`timeAgo`); unread → bold + accent dot. Per-row trash (remote → `deleteUserNotification`, local → `removePlanRequest`).
- [ ] **Step 3:** Summary card "Caixa de entrada": `unread` count "{{count}} por ler" (or "Tudo lido"), "Limpar tudo" (`clearPlanRequests()` + `clearUserNotifications()` + local state reset). Auto `markAllUserNotificationsRead()` after 2.5s on open (setTimeout), mirroring mobile. Empty state: "Sem notificações" + body + "Ativar alarmes" button → `/horarios`. Back button ("Voltar") → `navigate(-1)`. `<Layout noFooter>`.
- [ ] **Step 4:** `App.tsx` — replace `NotificacoesPage` import with `Notificacoes` for `/notificacoes`.
- [ ] **Step 5:** Verification: tsc + eslint → 0 errors; build PASS.

## Task 4.12: Phase 4 verification

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.app.json` → 0; `npx tsc --noEmit` → 0.
- [ ] **Step 2:** `npm run build` → PASS.
- [ ] **Step 3:** eslint over all Phase 4 touched files → 0 errors.
- [ ] **Step 4:** dev server + Playwright smoke (anon + logged-out): `/admin-gate` → restricted state; `/admin` → redirects home (non-admin); `/notificacoes` → empty state renders; Navbar shows for logged-out users no bell (can't auth in smoke — assert no crash + empty state). For authenticated admin flows rely on prior phases' data-limited note (edge functions need admin session; not exercisable anon).
- [ ] **Step 5:** Record results in this file under `Phase 4 verification results`.

---

## Risks

- **Edge functions auth:** `admin-manage` requires a valid session token with admin rights — anon smoke can't exercise tabs that self-load (messaging/reports/channels/announcements/users/receipts/withdrawals). Verification for those = tsc/eslint/build + render-gate smoke consuming the error state gracefully (catch → "Erro ao carregar" empty states), parity with mobile's load error handling.
- **Tab rename `comunidade`→`posts`:** `AdminComunidadeTab.tsx` stays a component but is now registered under `admin.tabPosts`; keep file name to avoid churn, only relabel in the tab bar.
- **planRequests localStorage:** web has no push/local notifications; keep ONLY the inbox-entry semantics (title/body/createdAt), pruned 24h30m, no system notification — documented degraded parity.
- **verify_admin_access_code RPC** must exist in the shared project (mobile migration ran). If missing → flag, do not fallback.
- Keep Phases 1–3 consumers compiling at every task boundary (esp. `Depositos` and `Navbar` edits).

---

## Review

**Status: PASS** — plan is well-formed, dependency-correct, and its claimed starting state is verified accurate against the web repo. Minor contract-level inaccuracies found (all within tasks that already instruct implementers to port verbatim from `mobile/` and verify keys at task time; none block execution).

**Strengths (verified against source):**
- Every Create/Edit path in the Files summary and per-task headers resolves to a real web file that exists (`src/pages/Admin.tsx`, `src/lib/adminApi.ts`, `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/components/layout/Navbar.tsx`, `src/pages/Perfil.tsx`, `src/pages/Depositos.tsx`, the 7 `src/components/admin/Admin*Tab.tsx`) or a new file that the task creates. No dangling references.
- Claimed current web state fully confirmed: 7-tab admin (Admin.tsx:33), email-only `AdminGuard`, `/notificacoes` → `NotificacoesPage` placeholder (App.tsx:60), no `/admin-gate` route, `signOut` without `lockAdmin` (AuthContext.tsx:38–42), `realtime.ts` `subscribeToChanges(name, listeners)` with per-listener `filter` (realtime.ts:11–29), web hooks via `@tanstack/react-query`.
- Mobile source-of-truth files all exist and match the plan's descriptions: `mobile/src/app/(tabs)/admin.tsx` (1,787 L), the 12-tab `Tab` union and `TABS` order exactly as listed in Task 4.4 Step 1 (admin.tsx:29–43), DashboardPanel stats/revenue/actions (admin.tsx:288–377), header `NotificationBadge` + `NotificationListModal` + `reportCount()` flag chip (admin.tsx:167, 216–222, 258–268), `get_users_count` RPC loadData (admin.tsx:111–118).
- `adminApi` action names in Task 4.2 Step 2 all exist in `mobile/src/lib/adminApi.ts` with identical payloads (`list_notifications`/`mark_notification_read`/`mark_all_notifications_read`/`unread_count`/`list_users`/`premium_count`/`expiring_count`/`revenue_stats`/`ban_user`/`update_user_role`/`update_subscription_expiry`/`send_dm`/`send_push`/`list_reports`/`dismiss_report`/`act_on_report`/`report_count`/`list_channels`/`update_channel`/`delete_channel`/`toggle_channel_premium`/`list_announcements`/`upsert_announcement`/`delete_announcement`/`bulk_delete_*`; `closeSignals` → `/functions/v1/close-signals` returning `data.closed`, adminApi.ts:110–126). RPC `verify_admin_access_code` + `p_code` confirmed (adminGate.ts:10).
- All quoted PT strings verified present in `mobile/src/lib/i18n/locales/pt.json` (UTF-8 no mojibake): `admin.tab*` (pt.json:295–305, 392), `gateTitle`/`gateSubtitle`/`gateCodeLabel`/`gateCta`/`gateWrong`/`restrictedTitle`/`restrictedDesc` (308–323), `markAllRead`/`noNotifications`/`selectedCount`/`deleteSelected`/`banUser`/`unbanUser`/`editExpiration`/`statExpiring`/`statPendingReceipts`/`userBanned`…`expiryUpdated` (426–448), `adminErrors.export`/`load`/`close` (450–456), `notifications.planRequestTitle`/`planRequestBodyAmount`/`planRequestBody` (834–836), entire `notificacoes.*` section incl. `emptyTitle`/`emptyBody`/`enableAlarms`/`clearAll`/`planProcessing`/`planPending`/`summaryTitle`/`unreadCount`/`allRead`/`today`/`thisWeek`/`earlier` (774–804). Task 4.11 `kindOf` regexes match mobile notificacoes.tsx:49–57 exactly; auto mark-read 2.5 s (notificacoes.tsx:167–172); pending-plan badge uses `planPending`/`planProcessing`; clear-all = planRequests + userNotifications.
- Dependency order (4.1 gate → 4.2 adminApi → 4.3 shared components → 4.4 admin page → 4.5–4.8 panels → 4.9 users/bulk → 4.10 notif lib/bell → 4.11 page → 4.12 verification) is correct: types/API precede consumers, gate precedes Admin redesign, notifications lib precedes Navbar and page. `useUnreadUserNotifications` realtime filter `user_id=eq.<id>` matches useUnreadUserNotifications.ts:35.
- Scope is bounded: nothing from Phase 5 (suporte-ia, diário, definições-booms, sinal-chart) is pulled in. The `/horarios` links (empty-state alarm CTA, Task 4.11 Step 3) target the existing Phase-1 `/horarios` route, matching mobile's link — not Phase 5 work.
- No placeholders/TBDs; RPC/edge-function names, action names, PT strings, and verification commands (`npx tsc --noEmit -p tsconfig.app.json`, `npm run build`, per-file `npx eslint`) are concrete. Risks section correctly flags admin-edge-function auth and degraded planRequests parity.

**Findings (minor):**

1. **Minor — Task 4.2 Step 1 `AdminNotification` type doesn't match the mobile contract.** Plan declares `AdminNotification { id, type, title, body, read, created_at, user_id? }`. Mobile `core/types.ts:271–281` is `{ id, type: NotificationType, title, message, entity_type?, entity_id?, data?, read, created_at }` — the rendered field is `message` (not `body`, which does not exist on the server payload), there is no `user_id?`, and `type` is the closed union `NotificationType` (receipt_pending|receipt_approved|receipt_rejected|withdrawal_pending|signal_closed|signal_tp|signal_sl|new_user|subscription_expired|subscription_expiring|system_error). A verbatim implementation of the plan's type would render empty notification bodies in `NotificationListModal`. Implementers must port the mobile interface exactly (the task also instructs this), but the plan text itself should be corrected.
2. **Minor — Task 4.3 Step 7 `TYPE_ICONS` example keys don't match real `type` values.** Plan lists `receipt|withdrawal|signal|report|boom|channel|user|announcement`; mobile NotificationListModal.tsx:19–31 keys are `receipt_pending`, `receipt_approved`, `receipt_rejected`, `withdrawal_pending`, `signal_closed`, `signal_tp`, `signal_sl`, `new_user`, `subscription_expired`, `subscription_expiring`, `system_error`. The plan's examples are hedged with "e.g.", but if taken literally the icon map would never match; port the mobile map verbatim (or a lucide pick per the actual keys).
3. **Minor — Task 4.9 Step 1 `updateUserRole('admin'|'member')` diverges from mobile.** Mobile admin toggles plan role `'free'`/`'premium'` for `update_user_role` (mobile admin.tsx:1064 and UserDetailModal `makePlanOptions`); `'admin'` is a *profile* role used elsewhere (ComunidadeNovoDm.tsx:15), not the value passed to the admin role action. Sending `'admin'`/`'member'` to the shared `update_user_role` edge function would not match mobile semantics. Use `'free'|'premium'` (the Plan & Subscrição cards in UserDetailModal).
4. **Minor — Tasks 4.4–4.8 lack per-task verification steps.** Phase 3's template ends every task with `Verification: tsc/build/eslint`, and the Phase 4 header (line 5) states verification per task. Tasks 4.5–4.8 have no verification step at all; 4.4 ends at a cleanup step. Phase-level Task 4.12 covers all touched files, so this is a style/gate-completeness gap, not a coverage hole — add per-task verification lines for consistency.
5. **Minor — copy instructions cite some `admin.*` keys that don't exist in pt.json.** `admin.sendDm`, `admin.pushTitle`, `admin.pushMessage`, `admin.noReports`, `admin.newAnnouncement`, `admin.editAnnouncement`, `admin.announcementTitle`, `admin.editChannel` are not keys in pt.json — mobile hardcodes this copy in the panels (MessagingPanel.tsx:85–119, ReportsPanel.tsx:97, ChannelsPanel.tsx:48–114, AnnouncementsPanel.tsx:112–170). The plan's hedge and the quoted literal strings mostly match mobile's hardcoded text; two nits: empty Reports state is "Sem reports" on mobile (ReportsPanel.tsx:97) — the plan suggests "Sem denúncias"; Channels delete-success toast is "Apagado" (ChannelsPanel.tsx:67) — the plan suggests "Eliminado". Align with mobile's exact copy.

**Informational (no change needed):**
- Task 4.1 Step 3 adds two behaviors beyond strict mobile parity (fine web adaptations): `isAdminUnlocked() → <Navigate to="/admin">` and a `ChevronLeft` back button; mobile admin-gate.tsx has neither.
- Task 4.11 Step 1 doesn't mention `pruneExpiredPlanRequests()` on page load (mobile notificacoes.tsx:121 calls it); harmless since the lib function is self-contained, but noting for fidelity.
- Task 4.11 Step 3 omits the bottom "Gerenciar Alertas" (`notificacoes.manageAlerts`) button that mobile renders after the list (notificacoes.tsx:367–373) — minor parity detail.

**Verdict rationale:** All findings are minor, contradiction-free with the plan's own "port verbatim from `mobile/`, verify keys at task time" convention, and none leave a task without a concrete path or acceptance gate. Current web-state claims, mobile file inventory, tab order, action names, PT strings, ordering, and scope are all verified correct.

VERDICT: PASS — roadmap is sound, complete, and dependency-correct; 5 minor contract/copy/verification-gap findings noted above should be corrected during implementation.

### Findings applied (all 5 corrected 2026-08-30)

1. ✅ T4.2 Step 1 — `AdminNotification` now ports `mobile/src/core/types.ts:271–281` exactly (`message`, `entity_type?/entity_id?/data?`, closed `NotificationType` union, `read`/`created_at` required, no `user_id`).
2. ✅ T4.3 Step 7 — `TYPE_ICONS` now keyed by the real `NotificationType` union (Receipt/CheckCircle2/XCircle/Wallet/TrendingDown/CheckCheck/X/UserPlus/CreditCard/Clock/AlertCircle), typed `Record<NotificationType, LucideIcon>`.
3. ✅ T4.9 Step 1 — `updateUserRole('free'|'premium')` (plan-role semantics), 'admin'/'member' removed.
4. ✅ T4.4 Step 6 + T4.5/T4.6/T4.7/T4.8 Step 2 — per-task tsc/eslint/build verification added (T4.9/T4.10/T4.11 already had them).
5. ✅ T4.5/T4.6/T4.7/T4.8 copy — non-existent `admin.*` keys removed; exact mobile hardcoded strings captured ("Sem reports", "Apagado", REASON_LABELS map, dialogs/toasts, placeholders).