# Digest — Phase 2 (Banca + Depósitos/Saques) mobile→web port sources

Research-only digest produced 2026-08-29. All mobile refs under `C:\Users\Luar Studio Angola\Desktop\DEV\TMT\mobile\`; web refs under `C:\Users\Luar Studio Angola\Desktop\DEV\TMT\`.

---

## 1. payments.ts — `mobile/src/lib/payments.ts`

```ts
export interface ReceiptFile { uri: string; mimeType: string; fileName: string; }

export async function uploadReceipt(
  userId: string,
  receipt: ReceiptFile,
): Promise<{ url: string | null; error?: string }>
```

- Uploads to Supabase Storage **bucket `payment-proofs`** (public read), path **`${userId}/proof-${Date.now()}.${ext}`** (ext from `uri.split('.').pop()`).
- Uses `expo-file-system` `File` — **RN-specific**. Web port: keep the `ReceiptFile` interface, implement with browser `File` (from `<input type="file">`) + `supabase.storage.from('payment-proofs').upload(...)` + `getPublicUrl`.
- Returns public URL (`{ data.publicUrl }`) or `{ error }`. `mobile/src/app/depositos.tsx:161` calls it with retry loop (2 retries, 1.5s apart).
- Web target: `src/lib/payments.ts` (does not exist yet).

Bucket policy (`supabase/migrations/20260822000000_receipts_withdrawals_admin.sql:198-219`): bucket public; `Public read payment-proofs` select policy; `Authenticated upload own payment-proofs` insert policy requiring path folder `= auth.uid()::text`. **No authenticated update/delete** — only service_role.

## 2. adminApi.ts — `mobile/src/lib/adminApi.ts` (465 lines)

Protocol (`:7-26`): `POST ${SUPABASE_URL}/functions/v1/admin-manage` with `Authorization: Bearer <access_token>`, `apikey`, body `{ action, ...payload }`. Throws `data.error` or generic message when `!res.ok || data.error`. Response JSON is returned verbatim.

| Function (mobile) | action | payload / response |
|---|---|---|
| `addSignal` | `add_signal` | symbol, timeframe, signal_type, entry_price, stop_loss, target_price, confidence, reasons |
| `deleteSignal(id)` | `delete_signal` | { id } |
| `updateSignalStatus(id,status)` | `update_status` | { id, status } |
| `addBoomHour` / `deleteBoomHour` | `add_boom_hour` / `delete_boom_hour` | title, time_gmt, time_wat, pairs, days, description, volatility, badge |
| `addBoomTime` / `updateBoomResult` / `deleteBoomTime` | `add_boom_time` / `update_boom_result` / `delete_boom_time` | pair, boom_time, confidence, result, image_url, audio_url |
| `addPost` / `deletePost` | `add_post` / `delete_post` | title, content, pair, signal_type, image_url?, audio_url? |
| `listUsers()` | `list_users` | → `data.users: {id,email,created_at,last_sign_in_at,role?,subscription_status?,subscription_expires?}[]` |
| `premiumCount()` | `premium_count` | → `{ count }` |
| `closeSignals()` | (separate fn `close-signals`) | → `{ closed }` |
| `listReceipts(status?, limit=50, offset=0)` | `list_receipts` | `{ status?, limit, offset }` → `{ receipts: PaymentReceipt[] }` (`:146-149`) |
| `approveReceipt(id)` | `approve_receipt` | { id } (`:151-153`) |
| `rejectReceipt(id)` | `reject_receipt` | { id } (`:155-157`) |
| `deleteReceipt(id)` | `delete_receipt` | { id } (`:159-161`) |
| **`saveReceipt(receipt)`** | **NOT an edge call — direct insert** (`:163-190`) | `supabase.from('payment_receipts').insert({ user_id: user.id, user_email, proof_url, plan, method, amount, currency, referral_code })`. Comment: "Inserção direta (RLS permite apenas a própria linha) — não passa pela função admin". `referral_code` comes from `getReferralCode()` (AsyncStorage `ref_code`). |
| `submitWithdrawalRequest(req)` | **direct insert** (`:428-444`) | `supabase.from('withdrawal_requests').insert({ user_id, method, amount, currency, details })` |
| `listWithdrawals(status?, limit=50, offset=0)` | `list_withdrawals` | → `{ withdrawals: WithdrawalRequest[] }` (`:446-449`) |
| `approveWithdrawal(id)` | `approve_withdrawal` | { id } (`:451-453`) |
| `rejectWithdrawal(id)` / `rejectWithdrawalWithNotes(id, notes?)` | `reject_withdrawal` | { id, notes } (`:455-457, :463-465`) |
| `markWithdrawalPaid(id)` | `mark_withdrawal_paid` | { id } (`:459-461`) |
| `listCapitalAccounts()` | `list_capital_accounts` | → `{ accounts: AdminCapitalAccount[] }` with emails from `auth.admin.listUsers()` (`:350-353`; edge `index.ts:801-822`) |
| `upsertCapitalAccount(data)` | `upsert_capital_account` | { user_id, capital?, achieved?, total_withdrawn?, currency? } (`:355-363`; edge `index.ts:823-839`) |
| `postCapitalReport(data)` | `post_capital_report` | { user_id, period_start, period_end, starting_balance, ending_balance, note?, currency? } → computes profit/profit_pct, upserts capital_accounts `achieved=end` (+`capital=start` if first) (`:365-375`; edge `index.ts:840-896`) |
| `listCapitalReports(userId)` | `list_capital_reports` | { user_id } → `{ reports: AdminCapitalReport[] }` (limit 52) (`:389-392`; edge `index.ts:897-908`) |
| `getNotifications` / `markNotificationRead` / `markAllNotificationsRead` / `getUnreadCount` | `list_notifications` / `mark_notification_read` / `mark_all_notifications_read` / `unread_count` | — |
| `banUser` / `updateUserRole` / `updateSubscriptionExpiry` | `ban_user` / `update_user_role` / `update_subscription_expiry` | — |
| `expiringCount()` / `revenueStats()` | `expiring_count` / `revenue_stats` | — |
| `sendDm` / `sendPush` | `send_dm` / `send_push` | — |
| `listReports` / `dismissReport` / `actOnReport` / `reportCount` | `list_reports` / `dismiss_report` / `act_on_report` / `report_count` | — |
| `listChannels` / `updateChannel` / `deleteChannel` / `toggleChannelPremium` | `list_channels` / `update_channel` / `delete_channel` / `toggle_channel_premium` | — |
| `listAnnouncements` / `upsertAnnouncement` / `deleteAnnouncement` | `list_announcements` / `upsert_announcement` / `delete_announcement` | — |
| `bulkDeleteSignals` / `bulkDeleteBoomHours` / `bulkDeleteBoomTimes` / `bulkDeletePosts` | `bulk_delete_signals` / `bulk_delete_boom_hours` / `bulk_delete_boom_times` / `bulk_delete_posts` | { ids } |

Types exported from mobile adminApi (web must mirror in `src/lib/adminApi.ts` or `src/lib/types.ts`):
- `PaymentReceipt` (`:130-144`): id, user_id, user_email, proof_url, plan, method, amount, currency, status `'pending'|'approved'|'rejected'`, reviewed_by, reviewed_at, `duplicate_of?: string|null`, created_at.
- `WithdrawalRequest` (`:414-426`): id, user_id, method, amount, currency, details, status `'pending'|'approved'|'rejected'|'paid'`, reviewed_by, reviewed_at, notes, created_at.
- `AdminCapitalAccount` (`:339-348`): user_id, email, currency `'usd'|'aoa'`, capital, achieved, total_withdrawn, status, updated_at?
- `AdminCapitalReport` (`:377-387`): id, period_start, period_end, starting_balance, ending_balance, profit, profit_pct, note, created_at.

⚠️ **Deployed edge function = `mobile/supabase/functions/admin-manage/index.ts`** (1178 lines) — contains ALL actions incl. capital + announcements + `save_receipt`. The root `supabase/functions/admin-manage/index.ts` is an OLDER copy (grep found no capital actions). Confirm which is deployed via `supabase functions list` if unsure. Phase 2 does NOT need new edge actions.

Edge function behavior details relevant to parity:
- `approve_receipt` (`mobile/supabase/functions/admin-manage/index.ts:352-452`): atomic `pending→approved` transition (`eq('status','pending')`); **upserts `subscriptions`** (plan lowercase, status 'active', `current_period_end` = now + 1 month, `onConflict user_id`); then **if plan==='premium' && amount>0 && referral_code → upsert `capital_accounts`** (`capital=amount, achieved=amount, currency from receipt, status 'active'`); notifies user (user_notifications + Expo push) + Resend email (best-effort).
- `reject_receipt` (`:454-499`): pending→rejected + notification/email.
- `post_capital_report` (`:840-896`): computes `profit = end - start`, `profit_pct` (rounded 2dp, guard div-by-0), inserts report, upserts `capital_accounts.achieved = end` (and `capital = start` only if account doesn't exist yet), notifies user with formatted signed profit.
- `mark_withdrawal_paid` sets `status='paid'` (no `paid_at` update in edge fn even though column exists).

## 3. Hooks

### `useBanca` — `mobile/src/hooks/useBanca.ts` (44 lines)
- `BANCA_STORAGE_KEY = 'banca_config'`; `BANCA_DEFAULTS: BancaConfig` all fields (capital 0, achieved 0, metaPercent 25, riskPercent 1, metaMonths '1-3 meses', planId 'conservador', startDate ISO now, nextWithdrawal '', totalWithdrawn 0, profitEarned 0).
- `useBanca()` → `{ config, loading, save }`; reads/mutates AsyncStorage (web: localStorage, same key). `save(next)` sets state + persists.

### `useSubscription` (mobile) — `mobile/src/hooks/useSubscription.ts`
- Fetches latest subscription `.order('updated_at', {ascending:false, nullsFirst:false}).limit(1)` (NOT maybeSingle — duplicate rows would null out) + realtime `subscriptions` filter `user_id=eq.X`.
- `withinPeriod(s)`: active if no `current_period_end` or `end > now`.
- `isPremium = status==='active' && periodActive`; `planTier` = validated plan or 'premium' fallback; **`canAccessBanca = isPremium && planTier === 'premium'`** (`:81`).
- Returns `{ user, subscription, isPremium, planTier, canAccessBanca, loading, checkout }`.
- ➡ Web's `src/hooks/useSubscription.ts` (51 lines) currently returns `{ user, subscription, tier, currency, loading, isPremium, hasAnalysis, limits, canAccessPair, canAccessTimeframe, checkout }` — **needs `canAccessBanca` + likely switch to `.limit(1)` order-desc + realtime invalidation**.

### `useCapitalAccount` — `mobile/src/hooks/useCapitalAccount.ts` (71 lines)
- Query `['capital-account', user.id]` → `capital_accounts.select('*').eq('user_id', X).maybeSingle()` → `CapitalAccount | null`.
- Query `['capital-reports', user.id]` → `capital_reports.select('*').eq('user_id', X).order('created_at', desc).limit(52)` → `CapitalReport[]`.
- Realtime: `subscribeToChanges('capital_accounts', [...] )` invalidates both queries on events for tables `capital_accounts` + `capital_reports` filtered `user_id=eq.X`.
- Returns `{ account, reports, loading }`.
- `subscribeToChanges` helper: `mobile/src/lib/realtime.ts` (29 lines) — wraps `supabase.channel(...).on('postgres_changes', {event:'*', schema:'public', table, filter}, ...)`. Web has `supabaseClient`; same API available (TanStack Query v5 already used).

### `useMovements` — `mobile/src/hooks/useMovements.ts` (168 lines)
- Types: `MovementType = 'deposit'|'withdrawal'`; `MovementStatus = 'pendente'|'concluido'|'recusado'`; `WalletMovement { id, type, method, amount, currency, plan?, status, receiptId?, notes?, createdAt, updatedAt? }`.
- `MOVEMENTS_STORAGE_KEY = 'wallet_movements'`.
- `toRow`/`fromRow` map to/from `wallet_movements` table (`user_id, type, method, amount, currency, plan, status, receipt_id, notes, created_at, updated_at`).
- **Local-first**: load AsyncStorage instantly → then fetch server `wallet_movements` (order created_at desc), merge = server ∪ local-only-by-id, sort desc, persist merged.
- `addMovement(m)` (no id/createdAt): optimistic local prepend + persist; fire-and-forget `supabase.insert(toRow)` (catch → ignore).
- `deleteMovement(id)`: local filter + persist; fire-and-forget `supabase.delete().eq('id', id)` (catch → ignore).
- `refresh()`: re-merge from server.
- Returns `{ movements, loading, addMovement, deleteMovement, refresh }`.
- `Crypto.randomUUID()` (expo-crypto) → web `crypto.randomUUID()`.
- RLS on table: `wm_insert_own` allows **authenticated** insert with `user_id = auth.uid()` — so direct client insert works for both apps.

## 4. Banca page — `mobile/src/app/banca.tsx` (290 lines)

Structure (imports `useTheme`, `useBanca`, `useSubscription`, `useCapitalAccount`, `useMovements`):
1. **Gate** (`:41-50`): `if (!subLoading && !canAccessBanca) return <PremiumLock label={t('capital.lockTitle')} description={t('capital.lockDesc')}>`. While `loading || subLoading` → loading text. "Um cliente premium NUNCA vê bloqueio."
2. **Data assembly** (`:54-75`): server is source of truth, local config fallback:
   - `capital = account?.capital ?? config.capital`; `current = account?.achieved ?? config.achieved`; `cur = account?.currency ?? config.currency ?? 'usd'`; `totalWithdrawn = account?.total_withdrawn ?? config.totalWithdrawn`; `latestReport = reports[0]`.
   - `profit = current - capital`; `profitPct = capital>0 ? profit/capital*100 : 0`; `isProfit = profit>=0`; `targetPct = config.metaPercent` (25); `targetValue = capital*targetPct/100`; `progressPct = clamp(profit/targetValue*100, 0..100)`.
   - `walletDeposits = Σ movements where type='deposit' && status!=='recusado' && currency===cur`; **`totalInvested = Math.max(walletDeposits, capital)`**.
   - `hasManagement = Boolean(account) || capital>0 || current>0`.
3. **Inactive branch** (`:77-137`): SectionTitle + subtitle → GradientCard hero (`+25%` eyebrow, "Depósito mínimo: $50 USD", StatusPill risk) → "Como funciona" card (3 steps wallet/trending/cash) → `CapitalSimulatorCard capital={0} currency="usd" strategy={config.planId} onDeposit={(amount)=>router.push('/depositos', {amount, currency:'usd'})}`.
4. **Active branch** (`:139-259`), ordered:
   - GradientCard hero: eyebrow `t('capital.currentBalance')`, StatusPill active, mono value `formatBancaMoney(current, cur)` (red if loss), footer row `capital.deposited` + signed profit & pct.
   - Latest report Card (if any) → pressable to `/diario-trader`: period date range (`formatShortDate(period_start) – formatShortDate(period_end)`), profit badge `+x.x%`, signed profit amount, note (2 lines).
   - Stats grid (4 Cards): Investido (`totalInvested`), Lucro (`+profit`), Meta (`+targetPct%`), Levantado (`totalWithdrawn`).
   - Progress Card: track bar `width: progressPct%`, labels `+formatBancaMoney(profit)` vs `Meta: +formatBancaMoney(targetValue)`.
   - `CapitalSimulatorCard capital={capital} currency={cur} strategy={config.planId}` (NO onDeposit here).
   - Withdrawal Card: `t('capital.withdrawalTitle')` + Badge weekly + desc + `AppButton` **`onPress={() => Alert.alert(withdrawalRequest, withdrawalMsg)}`** — mobile has NO real withdrawal request action on this page (just an alert). Real withdrawal lives in `/depositos`.
   - `GrowthPlanSection capital={capital} currency={cur}`.

## 5. Depositos page — `mobile/src/app/depositos.tsx` (804 lines)

Route params (expo-router): `{ plan?, currency?, amount? }` — web equivalent: `useSearchParams` from react-router (`/depositos?plan=premium&currency=usd&amount=500`). Web `src/pages/Planos.tsx:175` already deep-links `Link to={/depositos?plan=${planId}&currency=${currency}}`.

- **TabId** `'deposit' | 'withdraw'`, animated pill tabs.
- **Param sync effect** (`:56-68`): external param changes update `plan`/`currency`.
- **`isCapitalDeposit`** (`:72-76`): when `amount` param present & >0 → the screen locks into a single capital deposit of that amount (no currency segment, no plan chips).
- **deposit flow**:
  - `availableMethods = PAYMENT_METHODS.filter(m => currency==='usd' ? m.usd : m.aoa)` (`:108-111`).
  - `price = PRICES[currency][plan]` (display string); `planPrice = PLAN_PRICES[currency][plan]` (number) (`:113-114`).
  - **One pending deposit rule**: `hasPendingDepositRequest()` = count `payment_receipts where user_id & status='pending'` > 0, OR any local movement `type==='deposit' && status==='pendente'` (`:122-132`); enforced on `openDepositModal` and again on `confirmDeposit`.
  - `openDepositModal()` → sets `{ method?, initialProof? }` → renders `PaymentModal plan currency price onClose onConfirm method onMethodSelect availableMethods initialProof busy`.
  - `confirmDeposit(proof, retries=2)` (`:146-218`):
    1. Checks pending rule again.
    2. `depositAmount = customAmount ?? planPrice`.
    3. `uploadReceipt(user.id, proof)` with up to 2 retries (1.5s). On failure → Alert with "Tentar novamente" (recursion).
    4. `addMovement({ type:'deposit', method, amount: depositAmount, currency, plan: isCapitalDeposit?'capital':plan, status:'pendente' })` → writes local + `wallet_movements`.
    5. `saveReceipt({ user_id, user_email, proof_url, plan: isCapitalDeposit?'capital':plan, method, amount, currency })` (direct insert, includes referral_code).
    6. If **not** capital deposit → `savePendingPlanPayment({ plan, amount, currency })` (AsyncStorage pending payment, consumed by PremiumCapitalCredit on premium activation).
    7. Close modal → `ReceiptSuccessModal` visible → `notifyPlanRequestSubmitted(title, price)` (local push notification).
- **withdraw flow** (`:220-250`):
  - Fields: method chips (same `availableMethods`), `withdrawAmount` (decimal), `withdrawDetails` (multi-line; placeholder = selected method's `getDetails`).
  - `submitWithdrawal()`: validate method+amount>0+details → `submitWithdrawalRequest({ method, amount, currency, details })` (server direct insert) with catch-log → `addMovement({ type:'withdrawal', method, amount, currency, status:'pendente', notes })` → clear + Alert success.
- **Balance hero** (`:337-360`): GradientCard green (`${colors.primary}DD → #0B5C2E`), wallet icon, `currencySymbol` pill (USD/AOA), value `formatBancaMoney(banca.achieved, banca.currency ?? 'usd')`, "lock" subtitle. Shows local banca config balance (money managed by team).
- **History list** (`:506-517`): `formatMovementAmount` (`'$...'` / `'... Kz'`), movement rows with icon arrow-down (deposit, green) / arrow-up (withdraw, accent), label `movementCapital` / `movementDeposit {plan}` / `movementWithdraw`, method label + `formatShortDate(createdAt)`, signed amount, status Badge (concluido→success, recusado→destructive, else warning — note: **pending only shows "Pendente" text in UI, recusado not specially labeled**), delete (trash) button only when pending → `deleteMovement`.
- **ReceiptInbox** (`:84-96`): on mount + AppState 'active' → `getReceiptInbox()`; if present → `clearReceiptInbox()` + auto-open `PaymentModal` with `initialProof`. (Kept so an in-progress upload isn't lost; optional for web but cheap to port via localStorage.) `mobile/src/lib/receiptInbox.ts` key `payment_receipt_inbox`.

## 6. Capital components (web equivalents needed under `src/components/banca/` or similar)

| Mobile file | Props | Purpose / notes for web |
|---|---|---|
| `mobile/src/components/PaymentModal.tsx` (405 lines) | `{ plan, currency, price, onClose, onConfirm(proof: ReceiptFile|null), method?, onMethodSelect(m: PaymentMethod|undefined), availableMethods?, initialProof?, busy?, titleText? }` | Method grid (2-col cards, borderColor=method color) → selected method shows details + **copyable payment value** (`copyValue` via `expo-clipboard` → `navigator.clipboard`) + pay instructions + proof picker (`expo-image-picker` → web `<input type="file" accept="image/*">`) with preview (URI thumb + fileName + remove) + Cancel/`receiptSent` confirm (busy spinner). `assetToReceipt(asset)`: ext + mime `asset.mimeType || image/ext` + filename `proof-<Date.now()>.ext`. If confirm pressed with no proof → auto-launches picker. |
| `mobile/src/components/ReceiptSuccessModal.tsx` (183 lines) | `{ visible, onDone }` | Animated checkmark (reanimated spring; web: framer-motion or CSS transition), desktop "success" card: "Comprovativo enviado", body msg, warning "Pendente" badge, hint, OK button. |
| `mobile/src/components/CapitalSimulatorCard.tsx` (124 lines) | `{ capital, currency='usd', strategy='conservador', onDeposit? }` | `STRATEGY_RETURN_PCT = { conservador:25, equilibrado:20, agressivo:15 }` + name keys. Input amount (default `Math.round(capital)` if >0), rows Investido/Projetado (`amount*(1+pct/100)`), profit box, optional gold CTA **disabled when `amount < 50`** → `onDeposit(amount)`. |
| `mobile/src/components/GrowthPlanSection.tsx` (197 lines) | `{ capital, currency='usd' }` | 3 strategy cards (conservador +25%/3meses leaf, equilibrado +20%/2m analytics, agressivo +15%/1m rocket; radio select) + projection card (investimento, retorno estimado, período, lucro estimado) + Activate button. Persists `growth_plan` (AsyncStorage: `{planId, capital, activated}`) AND calls `useBanca.save({...config, planId})`. Once activated → disabled button + "Plano ativo" badge. |
| `mobile/src/components/PremiumCapitalCredit.tsx` (66 lines) | — (app root effect) | On premium active + referral_code present: consumes `payPendingPlanPayment('premium')` from AsyncStorage, sets `banca_config.capital = achieved = pending.amount`, `currency`, keeps startDate, tracks credited period. Best-effort. (Referral-only; optional for web.) |

## 7. Admin panels

### ReceiptsPanel — INLINE in `mobile/src/app/(tabs)/admin.tsx:1224-1489` (no separate file)
- Props `{ receipts, onRefresh, refreshing, onPullRefresh }`; receipts loaded by parent via `adminApi.listReceipts()`.
- `useAdminSearch` (`mobile/src/hooks/useAdminSearch.ts`): searchFields `['user_email','plan']`, filterConfig pending/approved/rejected over `status`.
- Summary cards: Pendentes / Aprovados / Rejeitados / **Volume** (Σ approved amounts, `pt-PT` locale).
- Card rows: avatar initials (first char of email), email-or-user_id(12), `receiptTimeAgo` + pt-PT short date, status badge (`statusConfig`), **"Possível duplicado" badge when `r.duplicate_of`**, info grid PLANO/MÉTODO/VALOR (method icon heuristic → Ionicons), actions: "Comprovativo" view (opens `proof_url`, web: `<a href target=_blank>`), pending → Aprovar/Rejeitar (Alert confirm), non-pending → Eliminar.
- `methodIcon(m)`: binance→bitcoin, rodot/pay→card, express/multicaixa→phone, else cash (→ lucide equivalents).

### WithdrawalsPanel — `mobile/src/components/admin/WithdrawalsPanel.tsx` (159 lines, full)
- `listWithdrawals()`; searchFields `['method','currency']`; filters pending/approved/rejected/**paid**.
- Summary: Pendentes / Aprovados / Pagos / Volume `$${totalVolume.toFixed(2)}` (Σ **approved** amounts).
- Item card: `METHOD_ICONS` emoji (`binance 💰, rodotpay 💳, express 💸`), method, `currency.toUpperCase() · timeAgo`, status badge, amount `$x.xx` (`Number(w.amount).toFixed(2)`), optional details text.
- Actions: pending → Aprovar + Rejeitar; approved → **Marcar Pago** (`markWithdrawalPaid`); rejected/paid → read-only. Reject passes no notes from UI (notes optional).

### Web admin current state
- `src/components/admin/` has only: `AdminSignalsTab`, `AdminBoomHoursTab`, `AdminComunidadeTab`, `AdminBoomTimesTab`, `AdminUsersTab` (the style model for new tabs).
- `src/pages/Admin.tsx` tab strip: signals / users / boom / comunidade / boom_times. **Needs `receipts` + `withdrawals` + `capital` tabs** (mobile admin.tsx tabs: dashboard, signals, boom, boom_times, posts, users, receipts, withdrawals, messaging, reports, channels, announcements).
- Web `src/lib/adminApi.ts` has only signals/boom actions + `uploadFile` — **needs the receipt/withdrawal/capital/notification functions above**.
- `src/components/signals/PremiumLock.tsx` exists on web (used for plan gating) — reuse for Banca gate.

## 8. Table schemas (exact, from migrations)

Authoritative migrations live in **`mobile/supabase/migrations/`** (mirrored/older subset in root `supabase/migrations/20260822000000_receipts_withdrawals_admin.sql`). Linked project: `the-magic-trader` ref `zwxplzdadgtiohnuotlu`.

**payment_receipts** (created `20260818140000`, columns added by `20260822040000` + `20260823110000`):
```
id          uuid PK default gen_random_uuid()
user_id     uuid NOT NULL → auth.users(id) ON DELETE CASCADE
user_email  text
proof_url   text NOT NULL
plan        text           (mobile v1: NOT NULL)
method      text
amount      numeric default 0            (root v2: numeric(14,2) default 0)
currency    text default 'usd'
status      text default 'pending'  CHECK (pending|approved|rejected)
reviewed_by uuid → auth.users (root v2)
reviewed_at timestamptz (root v2)
created_at  timestamptz default now()
referral_code  text          (20260823110000)
duplicate_of   uuid → payment_receipts(id)   (20260822040000)
```
- Unique partial: `uq_payment_receipts_one_pending_per_user (user_id) WHERE status='pending'` (`20260823100000`).
- Triggers: `trg_flag_duplicate_receipt` BEFORE INSERT (same proof_url, or same plan/method/amount within 30d → sets `duplicate_of`) (`20260822040000:87-127`); `trg_admin_receipt_notify` AFTER INSERT → admin_notifications `receipt_pending`.
- RLS: `receipts_insert_own` (insert, `user_id=auth.uid()`) + `receipts_select_own` (select own); service_role insert/update/delete. Indexes `(user_id, created_at desc)`, `(status)`. Realtime publication added.

**withdrawal_requests** (`20260820010000` + root v2):
```
id          uuid PK default gen_random_uuid()
user_id     uuid NOT NULL → auth.users ON DELETE CASCADE
method      text
amount      numeric(14,2) default 0
currency    text default 'usd'
details     text
status      text default 'pending'  CHECK (pending|approved|rejected|paid)
reviewed_by uuid
reviewed_at timestamptz
notes       text
paid_at     timestamptz            (added by root v2 migration)
created_at  timestamptz default now()
updated_at  timestamptz default now()  (trigger sets on update)
```
- Policies: `wr_select_own`, `wr_insert_own` (authenticated own row), `wr_all_service`. Indexes `(user_id)`, `(status)`, `(created_at desc)`. Trigger `trg_admin_withdrawal_notify` AFTER INSERT.

**capital_accounts** (`20260823080000`):
```
user_id         uuid PK → auth.users ON DELETE CASCADE
currency        text NOT NULL default 'usd' CHECK (usd|aoa)
capital         numeric(14,2) NOT NULL default 0
achieved        numeric(14,2) NOT NULL default 0
total_withdrawn numeric(14,2) NOT NULL default 0
status          text NOT NULL default 'active'
updated_at      timestamptz NOT NULL default now()
```
- RLS: `capital_accounts_select_own` (select), `capital_accounts_write_service` (service_role all). Realtime added.

**capital_reports** (`20260823080000`):
```
id               uuid PK default gen_random_uuid()
user_id          uuid NOT NULL → auth.users ON DELETE CASCADE
period_start     date NOT NULL
period_end       date NOT NULL
starting_balance numeric(14,2) NOT NULL
ending_balance   numeric(14,2) NOT NULL
profit           numeric(14,2) NOT NULL default 0
profit_pct       numeric(8,2) NOT NULL default 0
note             text
created_at       timestamptz NOT NULL default now()
```
- Index `(user_id, created_at desc)`; RLS same pattern; realtime added.

**wallet_movements** (`20260820000000`):
```
id          uuid PK default gen_random_uuid()
user_id     uuid NOT NULL → auth.users ON DELETE CASCADE
type        text NOT NULL CHECK (deposit|withdrawal)
method      text NOT NULL
amount      numeric NOT NULL
currency    text NOT NULL default 'usd'
plan        text
status      text NOT NULL default 'pendente' CHECK (pendente|concluido|recusado)
receipt_id  uuid → payment_receipts(id) ON DELETE SET NULL
notes       text
created_at  timestamptz default now()
updated_at  timestamptz default now()
```
- RLS: `wm_select_own`, `wm_insert_own` (authenticated), `wm_update_service`. Indexes `(user_id)`, `(status)`, `(created_at desc)`. Trigger `trg_wm_updated`.

**admin_notifications** (root v2 migration `:131-145`): id, type default 'system_error', title, message, entity_type, entity_id, data jsonb, read bool, created_at. No client policies (service_role only).

**Storage**: bucket `payment-proofs` public; `Public read payment-proofs` + `Authenticated upload own payment-proofs` (folder `user_id`). (Root v2 `:201-219`.)

**subscriptions**: `plan`, `currency` added; unique index `subscriptions_user_id_key(user_id)` (root v2 `:150-152`); `20260814100000` adds `status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at`. `get_user_plan(uid)` respects period dates (`20260822040000:59-80`); cron `expire-subscriptions-hourly` marks expired + inserts user_notifications.

## 9. RPCs & conventions

- **No new RPCs needed for Phase 2.** Client does direct inserts (payment_receipts, withdrawal_requests, wallet_movements) under RLS; admin reads/writes via `admin-manage` edge function.
- Server-side guards the business rules: one-pending-deposit partial unique index; duplicate detection trigger; approve flow owns subscription+capital crediting.
- **Money formatting** (`mobile/src/core/format.ts:140-156`):
  - `formatBancaMoney(n, currency='usd')` → aoa: `Math.round(n).toLocaleString('pt-PT') + ' Kz'`; usd: `'$' + formatMoney(n)`; `formatMoney` uses en-US `{minimumFractionDigits:2, maximumFractionDigits:2}`.
  - `formatShortDate`, `timeAgo`, `receiptTimeAgo` (`mobile/src/core/format.ts`, admin.tsx uses `receiptTimeAgo`). Web `src/lib/format.ts` has `formatSymbol, formatTimeframe, formatType, timeAgo, formatLongDate, formatShortDate` — **missing `formatMoney`/`formatBancaMoney`**.
- **Plan constants** (`mobile/src/lib/plans.ts`, 84 lines):
  - `Currency = 'usd'|'aoa'`; `PaymentMethod = 'binance'|'rodotpay'|'express'`; `PlanId = 'free'|'basic'|'pro'|'premium'`.
  - `PLANS` (id, icon Ionicons name, featured? premium). `PRICES[currency][plan]` display: usd `$14.99/$29.99/$49.99`, aoa `10.000/20.000/35.000 Kz`. `PLAN_PRICES` numeric: 14.99/29.99/49.99, 10000/20000/35000. `planLabel`.
  - `PAYMENT_METHODS` (each: id, label, icon, color, copyValue, getDetails(t), usd/aoa support): **binance** (usd only, copy `547723572`), **rodotpay** (usd+aoa, `1927969477`), **express** (aoa only, `+244926717730`). Web `src/lib/plans.ts` is Phase-1 (lucide icons) and **lacks PAYMENT_METHODS/prices** — port them.
- **Mobile vs web conventions to keep**: `t('...')` i18n keys used throughout (web uses hardcoded pt strings — decide: use existing pt strings on web per Phase 1 precedent); Ionicons→lucide-react mapping; `Alert.alert`→`window.confirm`/dialog; `StyleSheet`/theme→Tailwind classes; `AppButton/Card/Badge`→shadcn `button/card/badge`.

## 10. Web differences to confirm (phase-2 gap list)

Already exists on web (Phase 1):
- `src/lib/types.ts` `BancaConfig` (`:115-127`), `CapitalAccount` (`:130-138`), `CapitalReport` (`:141-152`) — **already ported**.
- `src/lib/gating.ts` (plan tiers/limits), `src/hooks/useSubscription.ts` (returns `tier` not `planTier`, no `canAccessBanca` — must add `canAccessBanca` mirroring mobile `isPremium && planTier==='premium'`).
- `src/pages/Planos.tsx:175` already links `/depositos?plan=&currency=`; `src/pages/Perfil.tsx:88` links `/depositos` "Depósitos e Saques".
- Routing: `src/App.tsx:52` routes `/depositos` → `PlaceholderPages.DepositosPage`; Banca → `PlaceholderPages.BancaPage` (`src/pages/PlaceholderPages.tsx`).
- Full shadcn/ui kit (dialog, sheet, tabs, badge, card, input, table, etc.) available.

Must create on web:
- `src/lib/payments.ts` (uploadReceipt, ReceiptFile, bucket `payment-proofs`).
- Extend `src/lib/adminApi.ts` with ≥ `listReceipts, approveReceipt, rejectReceipt, deleteReceipt, saveReceipt, listWithdrawals, approveWithdrawal, rejectWithdrawal, rejectWithdrawalWithNotes, markWithdrawalPaid` (+ capital + notifications functions if Phase 2 includes admin tabs).
- `src/hooks/useBanca.ts`, `src/hooks/useCapitalAccount.ts`, `src/hooks/useMovements.ts` (localStorage instead of AsyncStorage; `crypto.randomUUID()`; same query keys/realtime pattern).
- `src/pages/Banca.tsx`, `src/pages/Depositos.tsx` (replace placeholder routes).
- Components: `PaymentModal` (input-file + navigator.clipboard), `ReceiptSuccessModal`, `CapitalSimulatorCard`, `GrowthPlanSection`, balance hero, movement history list.
- Admin: `ReceiptsTab` + `WithdrawalsTab` components and tabs in `src/pages/Admin.tsx`.
- `formatMoney`/`formatBancaMoney` in `src/lib/format.ts`.
- Deep-linking: `/depositos?plan&currency&amount` (capital-deposit lock-in mode).

Platform substitutions (RN→web):
- `expo-image-picker` → `<input type="file" accept="image/*">` (+ objectURL preview); `expo-file-system File` → browser `File`/`FileReader`; `expo-clipboard` → `navigator.clipboard.writeText`; `AsyncStorage` → `localStorage`; `expo-crypto randomUUID` → `crypto.randomUUID()`; `expo-router params` → react-router `useSearchParams`; `react-native-reanimated` → framer-motion; `Ionicons` → lucide-react; `Alert.alert` → confirm dialog; `AppState` → `window.focus`/visibilitychange (receipt inbox).

## Flags / risks

1. **Edge function copies diverge**: root `supabase/functions/admin-manage/` is older (no capital actions). Deployed = likely `mobile/...`. Confirm with `supabase functions list` before relying on `list_capital_accounts` etc. — if the deployed fn lacks capital actions, the Banca page can still work because it reads `capital_accounts`/`capital_reports` directly via RLS select-own (no edge fn needed).
2. **Save paths**: `saveReceipt` + `submitWithdrawalRequest` + `wallet_movements` inserts are **direct client inserts** — web must replicate exactly (RLS allows own-row inserts).
3. **One-pending-deposit**: enforced in DB (partial unique index) AND in UI (`hasPendingDepositRequest` check). Web must show the same "pending deposit" alert to avoid ugly 23505 errors.
4. **Duplicate receipts**: `duplicate_of` set server-side by trigger; ReceiptsPanel displays "Possível duplicado" badge.
5. **Capital deposit mode** (`.amount` param) bypasses plan pricing and uses `plan:'capital'` in receipt + movement — keep the distinction.
6. **Currency support matrix**: usd→binance+rodotpay; aoa→rodotpay+express. Must filter method chips by currency on web too.
7. Web `useSubscription` queries `.single()` — mobile uses `.limit(1)` desc to survive duplicate rows; recommend aligning web to mobile's pattern.
8. Admin `approve_receipt` upserts subscription + month period + capital credit — web Admin tab must call the same edge action (no client-side logic).